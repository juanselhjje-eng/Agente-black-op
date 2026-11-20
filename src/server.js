import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
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

const ADMIN_RESERVATION_STATUSES = new Set(["pending_payment","payment_reported","scheduled","completed","cancelled","expired","overdue"]);
const ADMIN_PAYMENT_STATUSES = new Set(["pending","reported","verified","paid","approved","refunded","failed"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validDate = value => typeof value === "string" && !Number.isNaN(Date.parse(value));
function adminApiAuthorized(req) {
  const expected = config.adminApiKey;
  const supplied = req.get("x-admin-api-key") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function requireAdminApi(req, res, next) {
  if (!config.adminApiKey) return res.status(503).json({ error: "admin_ingestion_not_configured" });
  if (!adminApiAuthorized(req)) return res.status(401).json({ error: "unauthorized" });
  if (!config.databaseUrl || !store.ingestBusinessReservation) return res.status(503).json({ error: "postgresql_required" });
  return next();
}
app.post("/admin/v1/reservations", requireAdminApi, async (req, res) => {
  const x = req.body || {};
  if ((x.id !== undefined && !UUID_PATTERN.test(x.id)) ||
      (x.status && !ADMIN_RESERVATION_STATUSES.has(x.status)) ||
      !validDate(x.reservationDate) || !Number.isSafeInteger(x.players) || x.players < 1 || x.players > 500 ||
      typeof x.packageType !== "string" || !x.packageType.trim() || x.packageType.length > 80 ||
      !Number.isSafeInteger(x.totalCop) || x.totalCop < 0 ||
      (x.startsAt !== undefined && x.startsAt !== null && !validDate(x.startsAt)) ||
      (x.reservationCode !== undefined && (typeof x.reservationCode !== "string" || x.reservationCode.length > 80))) {
    return res.status(400).json({ error: "invalid_reservation_payload" });
  }
  try {
    const saved = await store.ingestBusinessReservation({ ...x, status: x.status || "pending_payment" });
    return res.status(201).json({ ok: true, reservation: saved });
  } catch (error) {
    if (error.code === "23505" || error.code === "23503" || error.code === "23514") return res.status(409).json({ error: "reservation_conflict_or_constraint" });
    console.error("Error guardando reserva comercial:", error);
    return res.status(500).json({ error: "admin_ingestion_failed" });
  }
});
app.post("/admin/v1/payments", requireAdminApi, async (req, res) => {
  const x = req.body || {};
  const status = x.status || "reported";
  if ((x.id !== undefined && !UUID_PATTERN.test(x.id)) ||
      (x.reservationId !== undefined && x.reservationId !== null && !UUID_PATTERN.test(x.reservationId)) ||
      !ADMIN_PAYMENT_STATUSES.has(status) || !Number.isSafeInteger(x.amountCop) || x.amountCop < 0 ||
      (["verified","paid","approved"].includes(status) && !validDate(x.verifiedAt)) ||
      (status === "refunded" && !validDate(x.refundedAt)) ||
      (x.verifiedAt !== undefined && x.verifiedAt !== null && !validDate(x.verifiedAt)) ||
      (x.refundedAt !== undefined && x.refundedAt !== null && !validDate(x.refundedAt))) {
    return res.status(400).json({ error: "invalid_payment_payload" });
  }
  try {
    const saved = await store.ingestBusinessPayment({ ...x, status });
    return res.status(201).json({ ok: true, payment: saved });
  } catch (error) {
    if (error.code === "23503" || error.code === "23514") return res.status(409).json({ error: "payment_conflict_or_constraint" });
    console.error("Error guardando pago comercial:", error);
    return res.status(500).json({ error: "admin_ingestion_failed" });
  }
});
app.post("/admin/v1/inventory", requireAdminApi, async (req, res) => {
  const x = req.body || {};
  if (typeof x.sku !== "string" || !x.sku.trim() || x.sku.length > 80 ||
      typeof x.name !== "string" || !x.name.trim() || x.name.length > 120 ||
      !Number.isSafeInteger(x.quantity) || x.quantity < 0 ||
      !Number.isSafeInteger(x.minimum) || x.minimum < 0) {
    return res.status(400).json({ error: "invalid_inventory_payload" });
  }
  try {
    const saved = await store.ingestBusinessInventory(x);
    return res.status(200).json({ ok: true, inventory: saved });
  } catch (error) {
    console.error("Error actualizando inventario comercial:", error);
    return res.status(500).json({ error: "admin_ingestion_failed" });
  }
});

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
    subagents: ["atencion-whatsapp", "supervisor-web-agenda", "investigador-web", "planificador-marketing", "analista-administrativo", "revisor", "auditor-general"],
    orchestration: { customerRouter: true, deterministicResponseReview: true },
    integrations: {
      gemini: Boolean(config.geminiApiKey),
      webResearch: secretary.subagents.investigadorWeb.isConfigured(),
      marketingPlanner: secretary.subagents.planificadorMarketing.isConfigured(),
      auditAgent: secretary.subagents.auditorGeneral.isConfigured(),
      adminAnalytics: secretary.subagents.analistaAdministrativo.isConfigured(),
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
