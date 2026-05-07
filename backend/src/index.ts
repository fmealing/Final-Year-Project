import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db";
import { initMqtt } from "./mqtt";
import { sessionsRouter } from "./routes/sessions";

const app  = express();
const PORT = process.env.PORT ?? 4000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "5mb" })); // sessions can carry ~300 packets

// ─── Simple API key auth (optional) ───────────────────────────────────────────
// Set API_KEY env var to enable; omit to allow unauthenticated access (dev only)
app.use((req, res, next) => {
  const key = process.env.API_KEY;
  if (!key) return next(); // auth disabled
  if (req.path === "/health") return next(); // always allow health check
  if (req.headers["x-api-key"] === key) return next();
  return res.status(401).json({ error: "Unauthorised" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/", sessionsRouter);

// ─── Start ────────────────────────────────────────────────────────────────────
async function main() {
  await initDb();
  initMqtt();
  app.listen(PORT, () => {
    console.log(`[server] Ghost Glove backend running on :${PORT}`);
  });
}

main().catch((e) => {
  console.error("[server] Fatal startup error:", e);
  process.exit(1);
});
