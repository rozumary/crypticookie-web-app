import express from "express";
import crypto from "crypto";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, where } from "firebase/firestore";

// ── Firebase initialization (self-contained, no external JSON import) ──
const firebaseConfig = {
  projectId: "gen-lang-client-0819411186",
  appId: "1:770220781866:web:68c0d3de23d00747edae53",
  apiKey: "AIzaSyD1f4UNutqgXQj8ILIL84A5vkK6W9YLU20",
  authDomain: "gen-lang-client-0819411186.firebaseapp.com",
  storageBucket: "gen-lang-client-0819411186.firebasestorage.app",
  messagingSenderId: "770220781866",
};
const FIRESTORE_DB_ID = "ai-studio-crypticookiehybr-2e813c40-d1a3-4fb8-8216-f3f09c7cb649";

let firestoreDb: ReturnType<typeof getFirestore> | null = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  firestoreDb = FIRESTORE_DB_ID && FIRESTORE_DB_ID !== "(default)"
    ? getFirestore(app, FIRESTORE_DB_ID)
    : getFirestore(app);
} catch (err) {
  console.error("Firebase init error in serverless function:", err);
}

// ── Helpers ──
function sha256Server(message: string): string {
  return crypto.createHash("sha256").update(message).digest("hex");
}

function determineGuidance(cookieType: string, verificationResult: string): string {
  if (verificationResult === "Warning") return "Warning";
  if (cookieType === "suspicious") return "Warning";
  if (cookieType === "necessary") return "Accept?";
  if (cookieType === "optional") return "Customize?";
  if (cookieType === "all") return "Opt for Necessary?";
  return "Customize?";
}

function determineAuditOutput(action: string): string {
  if (action === "accept") return "Consent Recorded";
  if (action === "reject") return "Rejection Recorded";
  if (action === "customize") return "Preference Change Recorded";
  return "Consent Recorded";
}

const DEFAULT_CMP_MAP: Record<string, { result: string; cmpName: string }> = {
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08": { result: "Verified", cmpName: "OneTrust Privacy Banner v6.32" },
  "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8": { result: "Verified", cmpName: "Cookiebot CMP (Usercentrics) v4.1" },
  "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a": { result: "Verified", cmpName: "Klaro! Open Source Consent v0.7" },
  "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d": { result: "Verified", cmpName: "Axeptio Consent SDK v2.0" },
  "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e": { result: "Warning", cmpName: "Malicious Deceptive Tracker Injector (Dark Pattern)" },
  "c2e26095908990cf250785f7a0c102a90038b36fa2d2a452ef2e63db7a6a4f7e": { result: "Warning", cmpName: "Stealth Fingerprint Harvester v1.2" },
};

async function verifyScriptHash(scriptHash: string, passedCmpName?: string, domain?: string): Promise<{ result: string; cmpName: string | null }> {
  const cleanHash = scriptHash.trim().toLowerCase();
  if (passedCmpName && (
    passedCmpName.includes("Google") || passedCmpName.includes("OneTrust") || passedCmpName.includes("Cookiebot") ||
    passedCmpName.includes("Didomi") || passedCmpName.includes("Klaro") || passedCmpName.includes("Axeptio") ||
    passedCmpName.includes("Meta") || passedCmpName.includes("Wikimedia")
  )) {
    return { result: "Verified", cmpName: passedCmpName };
  }
  if (domain) {
    const d = domain.toLowerCase();
    if (d.includes("google")) return { result: "Verified", cmpName: "Google Privacy & Consent Manager" };
    if (d.includes("facebook") || d.includes("messenger") || d.includes("instagram")) return { result: "Verified", cmpName: "Meta Privacy & Consent Manager" };
  }
  if (!firestoreDb) return DEFAULT_CMP_MAP[cleanHash] || { result: "Unverified", cmpName: null };
  try {
    const snapshot = await getDocs(query(collection(firestoreDb, "cmp_registry"), where("script_hash", "==", cleanHash)));
    if (snapshot.empty) return DEFAULT_CMP_MAP[cleanHash] || { result: "Unverified", cmpName: null };
    const item = snapshot.docs[0].data();
    if (item.status === "whitelist") return { result: "Verified", cmpName: item.cmp_name };
    if (item.status === "blacklist") return { result: "Warning", cmpName: item.cmp_name };
    return { result: "Unverified", cmpName: item.cmp_name };
  } catch (e) {
    console.warn("CMP registry lookup error:", e);
    return DEFAULT_CMP_MAP[cleanHash] || { result: "Unverified", cmpName: null };
  }
}

// ── Express App ──
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", firebase: !!firestoreDb, timestamp: new Date().toISOString() });
});

// CMP verify
app.post("/api/cmp/verify", async (req, res) => {
  try {
    const { hash, cmpName: clientCmpName, domain } = req.body;
    if (!hash) return res.status(400).json({ error: "hash is required." });
    const { result, cmpName } = await verifyScriptHash(String(hash), clientCmpName, domain);
    return res.json({ status: "success", verification: result, cmpName: cmpName || "Unverified CMP Script", hash: String(hash) });
  } catch (error: any) {
    console.error("CMP verify error:", error);
    return res.status(500).json({ error: error.message || "Failed to verify CMP hash." });
  }
});

// Record consent
app.post("/api/consent/record", async (req, res) => {
  try {
    const { domain, hash, action, cookieType, userId, username, trackers, cookieCount, cmpName } = req.body;
    if (!domain || !action) return res.status(400).json({ error: "domain and action are required." });

    const timestamp = new Date().toISOString();
    const siteDomain = String(domain).toLowerCase().trim();
    const scriptHash = hash ? String(hash).trim().toLowerCase() : "73926ef91823ab0288f34291f09e248b64e9123847a9821034f828108c90fe32";
    const cType = cookieType || "all";
    const uId = userId || "u_auditor_primary";

    const { result: verificationResult, cmpName: verifiedCmpName } = await verifyScriptHash(scriptHash, cmpName, siteDomain);
    const guidanceShown = determineGuidance(cType, verificationResult);
    const auditOutput = determineAuditOutput(action);

    const eventId = "ev_" + Math.random().toString(36).substring(2, 11);
    const cookieEvent = {
      id: eventId, user_id: uId, site_domain: siteDomain, cookie_hash: scriptHash,
      cookie_type: cType, consent_action: action, verification_result: verificationResult,
      guidance_shown: guidanceShown, created_at: timestamp,
    };

    // Public ledger
    let lastPubIndex = -1;
    let lastPubHash = "0000000000000000000000000000000000000000000000000000000000000000";
    if (firestoreDb) {
      const pubSnap = await getDocs(query(collection(firestoreDb, "public_ledger"), orderBy("block_index", "desc"), limit(1)));
      if (!pubSnap.empty) { const d = pubSnap.docs[0].data(); lastPubIndex = d.block_index; lastPubHash = d.hash; }
    }
    const nextPubIndex = lastPubIndex + 1;
    const pubBlockId = "pb_" + Math.random().toString(36).substring(2, 11);
    const pubHash = sha256Server(`${lastPubHash}|${nextPubIndex}|${siteDomain}|${scriptHash}|${verificationResult}|${action}|${timestamp}`);
    const publicBlock = {
      id: pubBlockId, block_index: nextPubIndex, prev_hash: lastPubHash, hash: pubHash,
      user_id: uId, site_domain: siteDomain, cookie_hash: scriptHash,
      verification_result: verificationResult, consent_action: action, timestamp,
    };

    // Private ledger
    let lastPrivIndex = -1;
    let lastPrivHash = "0000000000000000000000000000000000000000000000000000000000000000";
    if (firestoreDb) {
      const privSnap = await getDocs(query(collection(firestoreDb, "private_ledger"), where("user_id", "==", uId)));
      privSnap.forEach((d) => { const data = d.data(); if (data.block_index > lastPrivIndex) { lastPrivIndex = data.block_index; lastPrivHash = data.hash; } });
    }
    const nextPrivIndex = lastPrivIndex + 1;
    const privBlockId = "pv_" + Math.random().toString(36).substring(2, 11);
    const privHash = sha256Server(`${lastPrivHash}|${nextPrivIndex}|${uId}|${eventId}|${action}|${auditOutput}|${timestamp}`);
    const privateBlock = {
      id: privBlockId, block_index: nextPrivIndex, prev_hash: lastPrivHash, hash: privHash,
      user_id: uId, cookie_event_id: eventId, consent_action: action, audit_output: auditOutput, timestamp,
    };

    // Monitored domain
    const monId = "mon_" + uId + "_" + siteDomain.replace(/[^a-z0-9]/g, "_");
    const riskLevel = verificationResult === "Warning" || cType === "suspicious" ? "High" : verificationResult === "Unverified" ? "Moderate" : "Low";
    const monitoredDomain = {
      id: monId, user_id: uId, domain: siteDomain, url: `https://${siteDomain}`, title: siteDomain,
      cmp_detected: true, cmp_name: verifiedCmpName || cmpName || "Unverified CMP Script",
      script_hash: scriptHash, verification_result: verificationResult, consent_action: action,
      cookie_count: cookieCount || (trackers ? trackers.length + 3 : 5),
      trackers_count: trackers ? trackers.length : 0, trackers_list: trackers || [],
      privacy_risk_level: riskLevel, auto_blocked: action === "reject" || verificationResult === "Warning",
      guidance: guidanceShown, timestamp,
    };

    if (firestoreDb) {
      await Promise.all([
        setDoc(doc(firestoreDb, "cookie_events", cookieEvent.id), cookieEvent),
        setDoc(doc(firestoreDb, "public_ledger", publicBlock.id), publicBlock),
        setDoc(doc(firestoreDb, "private_ledger", privateBlock.id), privateBlock),
        setDoc(doc(firestoreDb, "monitored_domains", monId), monitoredDomain, { merge: true }),
      ]);
    }

    return res.json({
      status: "success", message: "Consent committed to blockchain ledger.",
      eventId, publicHash: pubHash, privateHash: privHash, publicBlockIndex: nextPubIndex,
      verification: verificationResult, cmpName: verifiedCmpName || cmpName || "Unverified CMP Script",
    });
  } catch (error: any) {
    console.error("Error recording consent:", error);
    return res.status(500).json({ error: error.message || "Failed to record consent." });
  }
});

// Record domain visit
app.post("/api/domains/record", async (req, res) => {
  try {
    const { domain, url, title, privacy_risk_level, userId, hash, trackers, cookieCount, cmpName } = req.body;
    if (!domain) return res.status(400).json({ error: "domain is required." });

    const siteDomain = String(domain).toLowerCase().trim();
    const timestamp = new Date().toISOString();
    const uId = userId || "u_auditor_primary";
    const scriptHash = hash ? String(hash).trim().toLowerCase() : "";

    let verificationResult = "Unverified";
    let detectedCmpName = cmpName || "Unverified CMP Script";
    if (scriptHash) { const v = await verifyScriptHash(scriptHash); verificationResult = v.result; if (v.cmpName) detectedCmpName = v.cmpName; }

    const riskLevel = privacy_risk_level || (verificationResult === "Warning" ? "High" : verificationResult === "Unverified" ? "Moderate" : "Low");
    const monId = "mon_" + uId + "_" + siteDomain.replace(/[^a-z0-9]/g, "_");
    const entry = {
      id: monId, user_id: uId, domain: siteDomain, url: url || `https://${siteDomain}`,
      title: title || siteDomain, cmp_detected: true, cmp_name: detectedCmpName,
      script_hash: scriptHash, verification_result: verificationResult,
      cookie_count: cookieCount || (trackers ? trackers.length + 3 : 5),
      trackers_count: trackers ? trackers.length : 0, trackers_list: trackers || [],
      privacy_risk_level: riskLevel, auto_blocked: riskLevel === "High" || riskLevel === "Critical",
      guidance: determineGuidance("all", verificationResult), timestamp,
    };

    if (firestoreDb) await setDoc(doc(firestoreDb, "monitored_domains", monId), entry, { merge: true });
    return res.json({ status: "success", entry });
  } catch (error: any) {
    console.error("Error logging domain:", error);
    return res.status(500).json({ error: error.message || "Failed to log domain." });
  }
});

// Consent history
app.get("/api/consent/history", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const events: any[] = [];
    if (firestoreDb) {
      const q = !userId || userId === "all"
        ? query(collection(firestoreDb, "cookie_events"))
        : query(collection(firestoreDb, "cookie_events"), where("user_id", "==", userId));
      (await getDocs(q)).forEach((d) => events.push({ id: d.id, ...d.data() }));
    }
    return res.json({ status: "success", data: events });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// Public ledger
app.get("/api/ledger/public", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const blocks: any[] = [];
    if (firestoreDb) {
      const q = !userId || userId === "all"
        ? query(collection(firestoreDb, "public_ledger"))
        : query(collection(firestoreDb, "public_ledger"), where("user_id", "==", userId));
      (await getDocs(q)).forEach((d) => blocks.push({ id: d.id, ...d.data() }));
      const gen = await getDoc(doc(firestoreDb, "public_ledger", "pb_genesis_0"));
      if (gen.exists() && !blocks.some((b) => b.id === gen.id)) blocks.push({ id: gen.id, ...gen.data() });
    }
    blocks.sort((a, b) => a.block_index - b.block_index);
    return res.json({ status: "success", data: blocks });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// Private ledger
app.get("/api/ledger/private", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const blocks: any[] = [];
    if (firestoreDb) {
      const q = !userId || userId === "all"
        ? query(collection(firestoreDb, "private_ledger"))
        : query(collection(firestoreDb, "private_ledger"), where("user_id", "==", userId));
      (await getDocs(q)).forEach((d) => blocks.push({ id: d.id, ...d.data() }));
      const gen = await getDoc(doc(firestoreDb, "private_ledger", "pv_genesis_0"));
      if (gen.exists() && !blocks.some((b) => b.id === gen.id)) blocks.push({ id: gen.id, ...gen.data() });
    }
    blocks.sort((a, b) => a.block_index - b.block_index);
    return res.json({ status: "success", data: blocks });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// Domains history
app.get("/api/domains/history", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const domains: any[] = [];
    if (firestoreDb) {
      const q = !userId || userId === "all"
        ? query(collection(firestoreDb, "monitored_domains"))
        : query(collection(firestoreDb, "monitored_domains"), where("user_id", "==", userId));
      (await getDocs(q)).forEach((d) => domains.push({ id: d.id, ...d.data() }));
    }
    domains.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return res.json({ status: "success", data: domains });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// Users
app.get("/api/users", async (req, res) => {
  try {
    const users: any[] = [];
    if (firestoreDb) (await getDocs(collection(firestoreDb, "users"))).forEach((d) => users.push({ id: d.id, ...d.data() }));
    return res.json({ status: "success", data: users });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// AI Bot
app.post("/api/bot/chat", async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message || typeof message !== "string") return res.status(400).json({ error: "A message string is required." });

    // Attempt Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const systemInstruction = "You are Crypticookie AI — an expert privacy, web security, and blockchain advisor. Provide concise, actionable advice about cookie consent, CMPs, trackers, and privacy regulations.";
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: context ? `[Context: ${JSON.stringify(context)}]\n\n${message}` : message }] }],
          config: { systemInstruction, temperature: 0.7 },
        });
        if (response.text) return res.json({ reply: response.text });
      } catch (e) { console.warn("Gemini failed:", e); }
    }

    // Fallback
    const q = message.toLowerCase();
    let reply = "";
    if (q.includes("shopee") || q.includes("lazada") || q.includes("amazon")) {
      reply = "🛍️ E-commerce sites use heavy tracking (Meta Pixel, Google Analytics, TikTok). Recommend: Reject Trackers or Essential Only.";
    } else if (q.includes("blockchain") || q.includes("ledger")) {
      reply = "⛓️ Crypticookie uses a dual-ledger: local IndexedDB for speed + Firestore public ledger for tamper-evident proof.";
    } else if (q.includes("dark pattern") || q.includes("deceptive")) {
      reply = "👁️ Dark patterns include pre-ticked boxes, hidden reject buttons, and asymmetric prominence. Crypticookie bypasses these.";
    } else {
      reply = `🤖 Crypticookie AI: "${message}" — Use our extension to inspect cookies and enforce privacy rules on any website.`;
    }
    return res.json({ reply });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// Debug clear
app.post("/api/debug/clear", async (req, res) => {
  try {
    const userId = String(req.query.userId || "u_auditor_primary");
    if (firestoreDb) {
      for (const col of ["cookie_events", "public_ledger", "private_ledger", "monitored_domains"]) {
        const snap = await getDocs(query(collection(firestoreDb, col), where("user_id", "==", userId)));
        for (const d of snap.docs) await setDoc(d.ref, { deleted: true }, { merge: true });
      }
    }
    return res.json({ status: "success" });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

export default app;
