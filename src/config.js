import path from "node:path";

const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: number(process.env.PORT, 3000),
  host: process.env.HOST || "127.0.0.1",
  dataDir: path.resolve(process.env.DATA_DIR || "./data"),
  databaseUrl: process.env.DATABASE_URL || "",
  pgPoolMax: Math.max(1, Math.min(30, number(process.env.PG_POOL_MAX, 10))),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET || "",
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || "v23.0",
  ownerWhatsAppNumber: process.env.OWNER_WHATSAPP_NUMBER || "",
  ownerAlertsEnabled: process.env.OWNER_ALERTS_ENABLED === "true",
  blackopsApiBaseUrl: process.env.BLACKOPS_PUBLIC_API_BASE_URL || "",
  blackopsApiEnabled: process.env.BLACKOPS_API_ENABLED === "true",
  websiteMonitorUrl: process.env.WEBSITE_MONITOR_URL || "",
  websiteMonitorIntervalMs: Math.max(30000, number(process.env.WEBSITE_MONITOR_INTERVAL_MS, 300000))
});
