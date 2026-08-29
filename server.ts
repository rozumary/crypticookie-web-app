import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    const { createServer: createViteServer } = await import("vite");
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
