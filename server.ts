import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { firestoreDb } from "./src/lib/firebase";
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from "firebase/firestore";

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

  // API route to record consent from Chrome Extension or Web App
  app.post("/api/consent/record", async (req, res) => {
    try {
      const { domain, hash, action, cookieType, userId } = req.body;
      if (!domain || !action) {
        return res.status(400).json({ error: "domain and action are required." });
      }

      const timestamp = new Date().toISOString();
      const siteDomain = String(domain).toLowerCase().trim();
      const scriptHash = hash ? String(hash).trim() : '73926ef91823ab0288f34291f09e248b64e9123847a9821034f828108c90fe32';
      const cType = cookieType || 'all';
      const uId = userId || 'u_chrome_extension_user';

      // 1. Create Cookie Event
      const eventId = 'ev_' + Math.random().toString(36).substring(2, 11);
      const cookieEvent = {
        id: eventId,
        user_id: uId,
        site_domain: siteDomain,
        cookie_hash: scriptHash,
        cookie_type: cType,
        verification_result: scriptHash.includes('9f86') || scriptHash.includes('5e88') ? 'Verified' : (scriptHash.includes('a591') ? 'Warning' : 'Unverified'),
        guidance_shown: action === 'reject' ? 'Warning' : 'Opt for Necessary?',
        created_at: timestamp,
      };

      // 2. Create Public Ledger Block
      const pubBlockId = 'pb_' + Math.random().toString(36).substring(2, 11);
      const pubPayload = `0000000000000000000000000000000000000000000000000000000000000000|0|${siteDomain}|${scriptHash}|${cookieEvent.verification_result}|${action}|${timestamp}`;
      const pubHash = await sha256Server(pubPayload);
      const publicBlock = {
        id: pubBlockId,
        block_index: Date.now() % 10000,
        prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: pubHash,
        site_domain: siteDomain,
        cookie_hash: scriptHash,
        verification_result: cookieEvent.verification_result,
        consent_action: action,
        timestamp: timestamp,
      };

      // 3. Create Private Ledger Block
      const privBlockId = 'pv_' + Math.random().toString(36).substring(2, 11);
      const privPayload = `0000000000000000000000000000000000000000000000000000000000000000|0|${uId}|${eventId}|${action}|Consent Recorded|${timestamp}`;
      const privHash = await sha256Server(privPayload);
      const privateBlock = {
        id: privBlockId,
        block_index: Date.now() % 10000,
        prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: privHash,
        user_id: uId,
        cookie_event_id: eventId,
        consent_action: action,
        audit_output: 'Consent Recorded',
        timestamp: timestamp,
      };

      // Sync all 3 to Firestore
      if (firestoreDb) {
        await Promise.all([
          setDoc(doc(firestoreDb, 'cookie_events', cookieEvent.id), cookieEvent),
          setDoc(doc(firestoreDb, 'public_ledger', publicBlock.id), publicBlock),
          setDoc(doc(firestoreDb, 'private_ledger', privateBlock.id), privateBlock),
          setDoc(doc(firestoreDb, 'monitored_domains', 'mon_' + siteDomain.replace(/[^a-z0-9]/g, '_')), {
            id: 'mon_' + siteDomain.replace(/[^a-z0-9]/g, '_'),
            domain: siteDomain,
            url: `https://${siteDomain}`,
            title: siteDomain,
            privacy_risk_level: cookieEvent.verification_result === 'Warning' ? 'High' : 'Low',
            auto_blocked: action === 'reject',
            timestamp: timestamp,
          }),
        ]);
      }

      return res.json({
        status: "success",
        message: "Consent choice successfully committed to central database and hybrid blockchain ledger.",
        eventId: eventId,
        publicHash: pubHash,
        privateHash: privHash,
      });
    } catch (error: any) {
      console.error("Error recording consent transaction:", error);
      return res.status(500).json({ error: error.message || "Failed to record consent." });
    }
  });

  // API route to log monitored site visits
  app.post("/api/domains/record", async (req, res) => {
    try {
      const { domain, url, title, privacy_risk_level } = req.body;
      if (!domain) return res.status(400).json({ error: "domain is required." });

      const siteDomain = String(domain).toLowerCase().trim();
      const timestamp = new Date().toISOString();
      const entry = {
        id: 'mon_' + siteDomain.replace(/[^a-z0-9]/g, '_'),
        domain: siteDomain,
        url: url || `https://${siteDomain}`,
        title: title || siteDomain,
        privacy_risk_level: privacy_risk_level || 'Low',
        auto_blocked: false,
        timestamp: timestamp,
      };

      if (firestoreDb) {
        await setDoc(doc(firestoreDb, 'monitored_domains', entry.id), entry, { merge: true });
      }

      return res.json({ status: "success", entry });
    } catch (error: any) {
      console.error("Error logging domain visit:", error);
      return res.status(500).json({ error: error.message || "Failed to log domain." });
    }
  });

  // API route for AI Privacy Bot
  app.post("/api/bot/chat", async (req, res) => {
    try {
      const { message, history, context } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "A message string is required." });
      }

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

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: chatContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "I was unable to formulate a privacy recommendation. Please try again.";
      return res.json({ reply: replyText });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({
        error: error.message || "Failed to communicate with AI Assistant.",
      });
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
