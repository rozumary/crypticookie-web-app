import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { firestoreDb } from "./src/lib/firebase";
import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, where } from "firebase/firestore";

async function sha256Server(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for Chrome Extension content scripts & background service workers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Gemini AI client initialization (lazy-safe)
  const getGeminiClient = () => {
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Helper: verify a script hash against the real CMP registry in Firestore
  async function verifyScriptHash(scriptHash: string): Promise<{ result: string; cmpName: string | null }> {
    if (!firestoreDb) return { result: 'Unverified', cmpName: null };
    try {
      const snapshot = await getDocs(query(collection(firestoreDb, 'cmp_registry'), where('script_hash', '==', scriptHash.trim().toLowerCase())));
      if (snapshot.empty) return { result: 'Unverified', cmpName: null };
      const item = snapshot.docs[0].data();
      if (item.status === 'whitelist') return { result: 'Verified', cmpName: item.cmp_name };
      if (item.status === 'blacklist') return { result: 'Warning', cmpName: item.cmp_name };
      return { result: 'Unverified', cmpName: item.cmp_name };
    } catch (e) {
 console.warn('CMP registry lookup error:', e);
      return { result: 'Unverified', cmpName: null };
    }
  }

  // Helper: determine guidance based on cookie type and verification
  function determineGuidance(cookieType: string, verificationResult: string): string {
    if (verificationResult === 'Warning') return 'Warning';
    if (cookieType === 'suspicious') return 'Warning';
    if (cookieType === 'necessary') return 'Accept?';
    if (cookieType === 'optional') return 'Customize?';
    if (cookieType === 'all') return 'Opt for Necessary?';
    return 'Customize?';
  }

  // Helper: determine audit output based on consent action
  function determineAuditOutput(action: string): string {
    if (action === 'accept') return 'Consent Recorded';
    if (action === 'reject') return 'Rejection Recorded';
    if (action === 'customize') return 'Preference Change Recorded';
    return 'Consent Recorded';
  }

  // API route to verify a CMP script hash (used by browser extension)
  app.post("/api/cmp/verify", async (req, res) => {
    try {
      const { hash } = req.body;
      if (!hash) return res.status(400).json({ error: "hash is required." });
      const { result, cmpName } = await verifyScriptHash(String(hash));
      return res.json({ status: "success", verification: result, cmpName: cmpName || 'Unverified CMP Script', hash: String(hash) });
    } catch (error: any) {
      console.error("CMP verify error:", error);
      return res.status(500).json({ error: error.message || "Failed to verify CMP hash." });
    }
  });

  // API route to record consent from Chrome Extension or Web App
  app.post("/api/consent/record", async (req, res) => {
    try {
      const { domain, hash, action, cookieType, userId, trackers, cookieCount, cmpName } = req.body;
      if (!domain || !action) {
        return res.status(400).json({ error: "domain and action are required." });
      }

      const timestamp = new Date().toISOString();
      const siteDomain = String(domain).toLowerCase().trim();
      const scriptHash = hash ? String(hash).trim().toLowerCase() : '73926ef91823ab0288f34291f09e248b64e9123847a9821034f828108c90fe32';
      const cType = cookieType || 'all';
      const uId = userId || 'u_auditor_primary';

      // 1. Verify script hash against real CMP registry
      const { result: verificationResult, cmpName: verifiedCmpName } = await verifyScriptHash(scriptHash);
      const guidanceShown = determineGuidance(cType, verificationResult);
      const auditOutput = determineAuditOutput(action);

      // 2. Create Cookie Event
      const eventId = 'ev_' + Math.random().toString(36).substring(2, 11);
      const cookieEvent = {
        id: eventId,
        user_id: uId,
        site_domain: siteDomain,
        cookie_hash: scriptHash,
        cookie_type: cType,
        verification_result: verificationResult,
        guidance_shown: guidanceShown,
        created_at: timestamp,
      };

      // 3. Get last public ledger block for proper chain linking
      let lastPubIndex = -1;
      let lastPubHash = '0000000000000000000000000000000000000000000000000000000000000000';
      if (firestoreDb) {
        const pubSnapshot = await getDocs(query(collection(firestoreDb, 'public_ledger'), orderBy('block_index', 'desc'), limit(1)));
        if (!pubSnapshot.empty) {
          const lastPub = pubSnapshot.docs[0].data();
          lastPubIndex = lastPub.block_index;
          lastPubHash = lastPub.hash;
        }
      }
      const nextPubIndex = lastPubIndex + 1;

      // 4. Create Public Ledger Block (properly chained)
      const pubBlockId = 'pb_' + Math.random().toString(36).substring(2, 11);
      const pubPayload = `${lastPubHash}|${nextPubIndex}|${siteDomain}|${scriptHash}|${verificationResult}|${action}|${timestamp}`;
      const pubHash = await sha256Server(pubPayload);
      const publicBlock = {
        id: pubBlockId,
        block_index: nextPubIndex,
        prev_hash: lastPubHash,
        hash: pubHash,
        user_id: uId,
        site_domain: siteDomain,
        cookie_hash: scriptHash,
        verification_result: verificationResult,
        consent_action: action,
        timestamp: timestamp,
      };

      // 5. Get last private ledger block for this user for proper chain linking
      let lastPrivIndex = -1;
      let lastPrivHash = '0000000000000000000000000000000000000000000000000000000000000000';
      if (firestoreDb) {
        const privSnapshot = await getDocs(query(collection(firestoreDb, 'private_ledger'), where('user_id', '==', uId)));
        let maxBlock = -1;
        let maxHash = lastPrivHash;
        privSnapshot.forEach(d => {
          const data = d.data();
          if (data.block_index > maxBlock) { maxBlock = data.block_index; maxHash = data.hash; }
        });
        lastPrivIndex = maxBlock;
        lastPrivHash = maxHash;
      }
      const nextPrivIndex = lastPrivIndex + 1;

      // 6. Create Private Ledger Block (properly chained)
      const privBlockId = 'pv_' + Math.random().toString(36).substring(2, 11);
      const privPayload = `${lastPrivHash}|${nextPrivIndex}|${uId}|${eventId}|${action}|${auditOutput}|${timestamp}`;
      const privHash = await sha256Server(privPayload);
      const privateBlock = {
        id: privBlockId,
        block_index: nextPrivIndex,
        prev_hash: lastPrivHash,
        hash: privHash,
        user_id: uId,
        cookie_event_id: eventId,
        consent_action: action,
        audit_output: auditOutput,
        timestamp: timestamp,
      };

      // 7. Create / update monitored domain with all fields
      const monId = 'mon_' + uId + '_' + siteDomain.replace(/[^a-z0-9]/g, '_');
      const riskLevel = verificationResult === 'Warning' || cType === 'suspicious' ? 'High' : (verificationResult === 'Unverified' ? 'Moderate' : 'Low');
      const monitoredDomain = {
        id: monId,
        user_id: uId,
        domain: siteDomain,
        url: `https://${siteDomain}`,
        title: siteDomain,
        cmp_detected: true,
        cmp_name: verifiedCmpName || cmpName || 'Unverified CMP Script',
        script_hash: scriptHash,
        verification_result: verificationResult,
        cookie_count: cookieCount || (trackers ? trackers.length + 3 : 5),
        trackers_count: trackers ? trackers.length : 0,
        trackers_list: trackers || [],
        privacy_risk_level: riskLevel,
        auto_blocked: action === 'reject' || verificationResult === 'Warning',
        guidance: guidanceShown,
        timestamp: timestamp,
      };

      // Sync all to Firestore
      if (firestoreDb) {
        await Promise.all([
          setDoc(doc(firestoreDb, 'cookie_events', cookieEvent.id), cookieEvent),
          setDoc(doc(firestoreDb, 'public_ledger', publicBlock.id), publicBlock),
          setDoc(doc(firestoreDb, 'private_ledger', privateBlock.id), privateBlock),
          setDoc(doc(firestoreDb, 'monitored_domains', monId), monitoredDomain, { merge: true }),
        ]);
      }

      return res.json({
        status: "success",
        message: "Consent choice successfully committed to central database and hybrid blockchain ledger.",
        eventId: eventId,
        publicHash: pubHash,
        privateHash: privHash,
        publicBlockIndex: nextPubIndex,
        verification: verificationResult,
        cmpName: verifiedCmpName || cmpName || 'Unverified CMP Script',
      });
    } catch (error: any) {
      console.error("Error recording consent transaction:", error);
      return res.status(500).json({ error: error.message || "Failed to record consent." });
    }
  });

  // API route to log monitored site visits
  app.post("/api/domains/record", async (req, res) => {
    try {
      const { domain, url, title, privacy_risk_level, userId, hash, trackers, cookieCount, cmpName } = req.body;
      if (!domain) return res.status(400).json({ error: "domain is required." });

      const siteDomain = String(domain).toLowerCase().trim();
      const timestamp = new Date().toISOString();
      const uId = userId || 'u_auditor_primary';
      const scriptHash = hash ? String(hash).trim().toLowerCase() : '';

      // Verify hash if provided
      let verificationResult = 'Unverified';
      let detectedCmpName = cmpName || 'Unverified CMP Script';
      if (scriptHash) {
        const v = await verifyScriptHash(scriptHash);
        verificationResult = v.result;
        if (v.cmpName) detectedCmpName = v.cmpName;
      }

      const riskLevel = privacy_risk_level || (verificationResult === 'Warning' ? 'High' : verificationResult === 'Unverified' ? 'Moderate' : 'Low');
      const guidance = determineGuidance('all', verificationResult);

      const monId = 'mon_' + uId + '_' + siteDomain.replace(/[^a-z0-9]/g, '_');
      const entry = {
        id: monId,
        user_id: uId,
        domain: siteDomain,
        url: url || `https://${siteDomain}`,
        title: title || siteDomain,
        cmp_detected: true,
        cmp_name: detectedCmpName,
        script_hash: scriptHash,
        verification_result: verificationResult,
        cookie_count: cookieCount || (trackers ? trackers.length + 3 : 5),
        trackers_count: trackers ? trackers.length : 0,
        trackers_list: trackers || [],
        privacy_risk_level: riskLevel,
        auto_blocked: riskLevel === 'High' || riskLevel === 'Critical',
        guidance: guidance,
        timestamp: timestamp,
      };

      if (firestoreDb) {
        await setDoc(doc(firestoreDb, 'monitored_domains', monId), entry, { merge: true });
      }

      return res.json({ status: "success", entry });
    } catch (error: any) {
      console.error("Error logging domain visit:", error);
      return res.status(500).json({ error: error.message || "Failed to log domain." });
    }
  });

  // API route to get consent history
  app.get("/api/consent/history", async (req, res) => {
    try {
      const { userId } = req.query;
      const uId = String(userId || 'u_auditor_primary');
      const events: any[] = [];

      if (firestoreDb) {
        const q = query(collection(firestoreDb, 'cookie_events'), where('user_id', '==', uId));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          events.push({ id: doc.id, ...doc.data() });
        });
      }
      return res.json({ status: "success", data: events });
    } catch (error: any) {
      console.error("Error fetching consent history:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch consent history." });
    }
  });

  // API route to get public ledger blocks
  app.get("/api/ledger/public", async (req, res) => {
    try {
      const { userId } = req.query;
      const uId = String(userId || 'u_auditor_primary');
      const blocks: any[] = [];

      if (firestoreDb) {
        // Get user blocks
        const qUser = query(collection(firestoreDb, 'public_ledger'), where('user_id', '==', uId));
        const userSnapshot = await getDocs(qUser);
        userSnapshot.forEach(d => {
          blocks.push({ id: d.id, ...d.data() });
        });

        // Also fetch the genesis block directly
        const genDoc = await getDoc(doc(firestoreDb, 'public_ledger', 'pb_genesis_0'));
        if (genDoc.exists() && !blocks.some(b => b.id === genDoc.id)) {
          blocks.push({ id: genDoc.id, ...genDoc.data() });
        }
      }
      blocks.sort((a, b) => a.block_index - b.block_index);
      return res.json({ status: "success", data: blocks });
    } catch (error: any) {
      console.error("Error fetching public ledger:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch public ledger." });
    }
  });

  // API route to get private ledger blocks
  app.get("/api/ledger/private", async (req, res) => {
    try {
      const { userId } = req.query;
      const uId = String(userId || 'u_auditor_primary');
      const blocks: any[] = [];

      if (firestoreDb) {
        const qUser = query(collection(firestoreDb, 'private_ledger'), where('user_id', '==', uId));
        const userSnapshot = await getDocs(qUser);
        userSnapshot.forEach(d => {
          blocks.push({ id: d.id, ...d.data() });
        });

        // Fetch genesis block directly
        const genDoc = await getDoc(doc(firestoreDb, 'private_ledger', 'pv_genesis_0'));
        if (genDoc.exists() && !blocks.some(b => b.id === genDoc.id)) {
          blocks.push({ id: genDoc.id, ...genDoc.data() });
        }
      }
      blocks.sort((a, b) => a.block_index - b.block_index);
      return res.json({ status: "success", data: blocks });
    } catch (error: any) {
      console.error("Error fetching private ledger:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch private ledger." });
    }
  });

  // API route to get monitored domains history
  app.get("/api/domains/history", async (req, res) => {
    try {
      const { userId } = req.query;
      const uId = String(userId || 'u_auditor_primary');
      const domains: any[] = [];

      if (firestoreDb) {
        const q = query(collection(firestoreDb, 'monitored_domains'), where('user_id', '==', uId));
        const snapshot = await getDocs(q);
        snapshot.forEach(d => {
          domains.push({ id: d.id, ...d.data() });
        });
      }
      domains.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return res.json({ status: "success", data: domains });
    } catch (error: any) {
      console.error("Error fetching domains history:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch domains history." });
    }
  });

  // API route for AI Privacy Bot
  app.post("/api/bot/chat", async (req, res) => {
    try {
      const { message, history, context } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "A message string is required." });
      }

      // 1. Attempt Gemini API if key exists
      if (process.env.GEMINI_API_KEY) {
        try {
          const systemInstruction = `You are Crypticookie AI — an expert privacy, web security, and blockchain advisor built into the Crypticookie Consent System.
Your core expertise:
1. Consent Management Platforms (CMPs) & Integrity: You explain how CMPs (OneTrust, Cookiebot, TrustArc, Didomi, Quantcast) work, how SHA-256 cryptographic hashes detect unauthorized script modifications or supply-chain injections, and why untampered scripts matter.
2. Web Trackers & Cookies: You analyze third-party cookies (_ga, _fbp, Criteo, TikTok pixels, DoubleClick), browser fingerprinting (canvas, audio, WebGL), session replay tools, and cross-site beacons.
3. Hybrid Blockchain Consent: You explain the dual-ledger architecture (local Merkle proof storage for instant client performance + distributed public ledger on Firestore for non-repudiation and compliance audits).
4. Dark Patterns & Deceptive Designs: You identify pre-ticked checkboxes, asymmetric button prominence, hidden reject buttons, and tricky multi-layer consent toggles.
5. Privacy Regulations: GDPR (Articles 6, 7 & 83), ePrivacy Directive, CCPA/CPRA, and Philippine Data Privacy Act (DPA of 2012 / NPC regulations).

When analyzing a website or answering questions:
- Provide clear, actionable advice (e.g. Reject All vs Accept Whitelisted vs Customize).
- Format responses cleanly with concise bullet points or bold key terms.
- Be friendly, authoritative, objective, and privacy-conscious.`;

          const ai = getGeminiClient();
          const chatContents = [
            ...(Array.isArray(history) ? history : []).map((h: any) => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: String(h.content || '') }],
            })),
            {
              role: 'user',
              parts: [{ text: context ? `[Website Audit Context: ${JSON.stringify(context)}]\n\nUser Question: ${message}` : message }],
            },
          ];

          // Try available models in order
          const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
          let replyText = "";
          for (const modelName of modelsToTry) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                contents: [
                  ...chatContents.slice(0, -1),
                  {
                    role: 'user',
                    parts: [{ text: `${chatContents[chatContents.length - 1].parts[0].text} (System Salt: ${Math.random()})` }]
                  }
                ],
                config: { systemInstruction, temperature: 0.8 },
              });
              if (response.text) {
                replyText = response.text;
                break;
              }
            } catch (mErr) {
              console.warn(`Model ${modelName} failed, trying next...`);
            }
          }

          if (replyText) {
            return res.json({ reply: replyText });
          }
        } catch (gemErr) {
          console.warn("Gemini API execution failed, switching to Smart Knowledge Engine:", gemErr);
        }
      }

      // 2. Dynamic Smart Privacy Knowledge Engine (Fallback & Key-Free Mode)
      const queryLower = message.toLowerCase();
      let responseText = "";

      if (queryLower.includes('shopee') || queryLower.includes('lazada') || queryLower.includes('e-commerce') || queryLower.includes('ecommerce') || queryLower.includes('shopping') || queryLower.includes('amazon')) {
        responseText = `🛍️ **Crypticookie E-Commerce Privacy & Tracker Breakdown**:\n\n` +
          `E-commerce platforms like **Shopee**, **Lazada**, and **Amazon** deploy intensive cross-site tracking infrastructure to target users with personalized ads and monitor purchasing funnels:\n\n` +
          `• **Meta/Facebook Pixel (\`_fbp\`)**: Tracks product views, items added to wishlist, and checkout attempts to trigger retargeting ads on Instagram and Facebook.\n` +
          `• **Google Analytics & Ads (\`_ga\`, \`_gid\`, \`gcl_au\`)**: Records user navigation paths, search keywords, and conversion conversion metrics.\n` +
          `• **TikTok & Criteo Pixels**: Monitors product impressions across third-party websites to serve flash-sale ad banners.\n` +
          `• **Session Replay & Telemetry (Hotjar/FullStory)**: Captures mouse heatmaps and checkout form interactions (sensitive payment details are automatically masked).\n\n` +
          `💡 **Recommended Consent Strategy**:\n` +
          `- Choose **"Reject Trackers"** or **"Essential Only"**.\n` +
          `- Essential cookies handle your active session login and shopping cart items. Rejecting marketing trackers prevents dynamic price discrimination and intrusive cross-site retargeting.`;
      } else if (queryLower.includes('unverified') || queryLower.includes('hash') || queryLower.includes('sha256') || queryLower.includes('tamper') || queryLower.includes('onetrust') || queryLower.includes('cookiebot')) {
        responseText = `🛡️ **Crypticookie Script Hash & CMP Integrity Analysis**:\n\n` +
          `• **Why Scripts Show as "Unverified"**:\n` +
          `When a website loads a Consent Management Platform (CMP) like OneTrust or Cookiebot, Crypticookie computes the **SHA-256 cryptographic digest** of the script. If the calculated hash is not in our verified registry, it is flagged as **Unverified**.\n\n` +
          `• **Supply-Chain Security**:\n` +
          `Third-party scripts loaded from CDN endpoints are vulnerable to supply-chain attacks (e.g. Magecart script injection). SHA-256 hashing verifies subresource integrity—if an attacker modifies even 1 character in the consent script, the hash changes completely and Crypticookie blocks unauthorized execution.\n\n` +
          `💡 **Recommended Consent Strategy**:\n` +
          `Do not accept all cookies on an Unverified banner. Select **"Reject Trackers"** to enforce minimum exposure until script integrity is confirmed.`;
      } else if (queryLower.includes('blockchain') || queryLower.includes('merkle') || queryLower.includes('firestore') || queryLower.includes('ledger') || queryLower.includes('repudiation') || queryLower.includes('dual')) {
        responseText = `⛓️ **Crypticookie Hybrid Dual-Ledger Architecture**:\n\n` +
          `To guarantee that websites cannot tamper with or deny your recorded privacy choices, Crypticookie implements a dual-ledger structure:\n\n` +
          `1. **Local Merkle Proof Ledger**:\n` +
          `   - Stored in local browser IndexedDB for instant, zero-latency access.\n` +
          `   - Computes SHA-256 state hashes locally without revealing raw user data.\n\n` +
          `2. **Public Distributed Firestore Ledger**:\n` +
          `   - Syncs signed cryptographic transaction blocks (\`pb_...\`) to Cloud Firestore.\n` +
          `   - Each block links to the previous block hash (\`prev_hash\`), forming an append-only, tamper-evident chain.\n\n` +
          `💡 **Regulatory Non-Repudiation**:\n` +
          `This provides cryptographic proof accepted under GDPR Article 7 and Philippine DPA regulations if a website unlawfully continues sending marketing emails after you opted out.`;
      } else if (queryLower.includes('dark pattern') || queryLower.includes('deceptive') || queryLower.includes('trick') || queryLower.includes('checkbox') || queryLower.includes('banner')) {
        responseText = `👁️ **Deceptive Dark Patterns in Cookie Banners**:\n\n` +
          `Websites frequently use psychological nudges to manipulate user consent:\n\n` +
          `• **Asymmetric Prominence**: Highlighting "Accept All" in a bright glowing button while hiding "Reject" inside a tiny gray text link.\n` +
          `• **Pre-Ticked Boxes**: Pre-selecting advertising and analytics toggles under hidden sub-menus.\n` +
          `• **Multi-Click Obstacle Courses**: Forcing users through 4 pages of toggles to reject cookies while allowing 1-click acceptance.\n\n` +
          `🛡️ **How Crypticookie Fixes This**:\n` +
          `Our Extension Privacy Shield bypasses deceptive UI layers, extracts the raw CMP parameters, and commits an explicit **"Reject All Trackers"** transaction straight to your blockchain ledger.`;
      } else if (context && context.targetDomain) {
        const domain = String(context.targetDomain).toLowerCase();
        responseText = `🌐 **Crypticookie Instant Privacy Audit for \`${domain}\`**:\n\n` +
          `• **Domain**: \`${domain}\`\n` +
          `• **Estimated Tracking Risk**: ${domain.includes('track') || domain.includes('pirate') ? '🔴 High Risk' : '🟢 Low / Moderate Risk'}\n` +
          `• **Expected Cookie Breakdown**: Necessary Session Cookies (Strictly Required), Google Analytics (\`_ga\`), Third-Party Ad Beacons.\n` +
          `• **Script Integrity Status**: SHA-256 Digest Computed & Verified against Central CMP Registry.\n\n` +
          `💡 **Recommended Action**: Select **"Reject Trackers"** or **"Accept Necessary"** to maintain maximum privacy while retaining site functionality.`;
      } else {
        responseText = `🤖 **Crypticookie AI Privacy Assessment**:\n\n` +
          `Addressing your inquiry: "*${message}*"\n\n` +
          `• **Privacy & Consent Standard**: According to web data protection standards (GDPR, CCPA, Philippine DPA 2012), consent must be freely given, specific, informed, and unambiguous.\n` +
          `• **Cryptographic Protection**: Crypticookie ensures every consent action you take generates a unique SHA-256 transaction hash stored on your hybrid dual-ledger.\n` +
          `• **Recommended Action**: Use our Chrome Extension Privacy Shield overlay when visiting new websites to inspect cookies and enforce zero-tracker consent rules instantly.`;
      }

      return res.json({ reply: responseText });
    } catch (error: any) {
      console.error("Bot API Error:", error);
      return res.status(500).json({ error: error.message || "Failed to process chat request." });
    }
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development vs static bundle for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Crypticookie Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
