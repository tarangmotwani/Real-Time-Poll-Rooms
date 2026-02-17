import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: express.Express) {
  const distPath = path.resolve(__dirname, "../dist/public");

  app.use(express.static(distPath));

  // Express 5 compatible catch-all
  app.use((req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}