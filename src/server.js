import "dotenv/config";
import express from "express";
import { config } from "./config.js";
import { createSecretary } from "./agents/secretary.js";
import { createWhatsAppClient } from "./integrations/whatsapp.js";
import { verifyWhatsAppSignature } from "./integrations/whatsapp-signature.js";
import { createWebsiteMonitor } from "./integrations/website-monitor.js";
import { createStore } from "./storage/json-store.js";
import { createPostgresStore } from "./storage/postgres-store.js";
import { startEscalationWorker } from "./workers/escalation-worker.js";
import { startWebsiteMonitorWorker } from "./workers/website-monitor-worker.js";
import { startOwnerReportWorker } from "./workers/owner-report-worker.js";

const app = express();
const store = config.databaseUrl
  ? createPostgresStore({ connectionString: config.databaseUrl, max: config.pgPoolMax })
  : createStore(config.dataDir);
await store.init?.();

const whatsapp = createWhatsAppClient(config);
const secretary = createSecretary({ config, store, whatsapp });
const websiteMonitor = createWebsiteMonitor({ url: config.websiteMonitorUrl });

app.get("/health", async (_req, res) => {
  let database = "json-local";
  if (config.databaseUrl) {
    try { await store.init(); database = "postgresql"; }
    catch { return res.status(503).json({ status: "degraded", database: "unavailable" }); }
  }
  res.status(200).json({
    status: "ok",
    service: "agente-black-ops",
    role: "secretario-principal",
    storage: database,
    subagents: ["atencion-whatsapp", "supervisor-web-agenda", "investigador-web", "analista-administrativo", "revisor", "auditor-general"],
    orchestration: { customerRouter: true, deterministicResponseReview: true },
    integrations: {
      gemini: Boolean(config.geminiApiKey),
      webResearch: secretary.subagents.investigadorWeb.isConfigured(),
      whatsapp: whatsapp.isConfigured(),
      blackopsPublicApi: config.blackopsApiEnabled && Boolean(config.blackopsApiBaseUrl),
      websiteMonitor: websiteMonitor.isConfigured()
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/health/website", async (_req, res) => {
  const latest = await store.getLatestWebsiteCheck();
  res.status(latest?.ok ? 200 : 503).json({ configured: websiteMonitor.isConfigured(), latest });
});

app.get("/", (_req, res) => res.json({
  name: "Secretario Black Ops",
  status: "running",
  message: "El Secretario principal coordina los subagentes especializados."
}));

app.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === config.whatsappVerifyToken) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post("/webhooks/whatsapp", express.raw({ type: "application/json", limit: "2mb" }), async (req, res) => {
  const rawBody = req.body;
  if (config.nodeEnv === "production" && !config.whatsappAppSecret) return res.sendStatus(503);
  if (config.whatsappAppSecret && !verifyWhatsAppSignature(rawBody, req.get("x-hub-signature-256"), config.whatsappAppSecret)) return res.sendStatus(401);
  let payload;
  try { payload = JSON.parse(rawBody.toString("utf8")); }
  catch { return res.sendStatus(400); }
  res.sendStatus(200);
  try { await secretary.handleWebhook(payload); }
  catch (error) { console.error("Error procesando webhook:", error); }
});

app.use(express.json({ limit: "1mb" }));
app.use((error, _req, res, _next) => {
  console.error("Error HTTP:", error);
  res.status(500).json({ error: "internal_error" });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Secretario Black Ops escuchando en http://${config.host}:${config.port}`);
});
const stopEscalationWorker = startEscalationWorker({ store, whatsapp, config });
const stopWebsiteMonitor = startWebsiteMonitorWorker({ monitor: websiteMonitor, store, whatsapp, config });
const ownerReportWorker = startOwnerReportWorker({ store, whatsapp, config });
let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  stopEscalationWorker();
  stopWebsiteMonitor();
  ownerReportWorker.stop();
  server.close(async () => {
    try { await store.close?.(); }
    catch (error) { console.error("Error cerrando almacenamiento:", error); }
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
