import "dotenv/config";
import express from "express";
import { config } from "./config.js";
import { createSecretary } from "./agents/secretary.js";
import { createWhatsAppClient } from "./integrations/whatsapp.js";
import { verifyWhatsAppSignature } from "./integrations/whatsapp-signature.js";
import { createStore } from "./storage/json-store.js";
import { startEscalationWorker } from "./workers/escalation-worker.js";

const app = express();
const store = createStore(config.dataDir);
const whatsapp = createWhatsAppClient(config);
const secretary = createSecretary({ config, store, whatsapp });

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "agente-black-ops",
    role: "secretario-principal",
    subagents: ["atencion-whatsapp", "supervisor-web-agenda", "investigador-web", "analista-administrativo", "revisor", "auditor-general"],
    integrations: { gemini: Boolean(config.geminiApiKey), whatsapp: whatsapp.isConfigured() },
    timestamp: new Date().toISOString()
  });
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
  if (mode === "subscribe" && token && token === config.whatsappVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/webhooks/whatsapp", express.raw({ type: "application/json", limit: "2mb" }), async (req, res) => {
  const rawBody = req.body;
  if (config.whatsappAppSecret && !verifyWhatsAppSignature(rawBody, req.get("x-hub-signature-256"), config.whatsappAppSecret)) {
    return res.sendStatus(401);
  }
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.sendStatus(400);
  }
  res.sendStatus(200);
  try {
    await secretary.handleWebhook(payload);
  } catch (error) {
    console.error("Error procesando webhook:", error);
  }
});

app.use(express.json({ limit: "1mb" }));
app.use((error, _req, res, _next) => {
  console.error("Error HTTP:", error);
  res.status(500).json({ error: "internal_error" });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Secretario Black Ops escuchando en http://${config.host}:${config.port}`);
});
const stopWorker = startEscalationWorker({ store, whatsapp, config });
const shutdown = () => {
  stopWorker();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
