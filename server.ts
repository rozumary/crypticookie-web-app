import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index.js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Mount the API application (it handles its own CORS, JSON parsing, and routing)
  app.use(apiApp);

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

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Crypticookie Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
