import test from "node:test";
import assert from "node:assert/strict";
import { getDueOwnerReports, startOwnerReportWorker } from "../src/workers/owner-report-worker.js";

test("programa el reporte diario en la hora local configurada", () => {
  const due = getDueOwnerReports(new Date("2026-11-19T13:00:00.000Z"), { timeZone: "America/Bogota", dailyTime: "08:00", weeklyTime: "08:15" });
  assert.deepEqual(due.map(item => item.key), ["daily:2026-11-19"]);
});

test("programa el semanal los lunes sin confundir la fecha UTC y recupera arranques tardíos", () => {
  const due = getDueOwnerReports(new Date("2026-11-23T13:15:00.000Z"), { timeZone: "America/Bogota", dailyTime: "08:00", weeklyTime: "08:15" });
  assert.deepEqual(due.map(item => item.key), ["daily:2026-11-23", "weekly:2026-11-23"]);
  const late = getDueOwnerReports(new Date("2026-11-23T15:00:00.000Z"), { timeZone: "America/Bogota", dailyTime: "08:00", weeklyTime: "08:15" });
  assert.deepEqual(late.map(item => item.key), ["daily:2026-11-23", "weekly:2026-11-23"]);
});

test("no envía dos veces el mismo periodo ya auditado", async () => {
  const sent = [], audits = [];
  const store = {
    listAudit: async () => [{ type: "scheduled_owner_report_sent", key: "daily:2026-11-19" }],
    getOperationalMetrics: async () => ({ inboundMessages: 0, outboundMessages: 0, escalationsOpened: 0, escalationsAnswered: 0, escalationsTimedOut: 0, escalationsPending: 0, websiteChecks: 0, websiteFailures: 0, webChangesPending: 0, webChangesApprovedPending: 0 }),
    audit: async item => audits.push(item)
  };
  const worker = startOwnerReportWorker({
    store, whatsapp: { sendText: async (...args) => sent.push(args) },
    config: { ownerReportsEnabled: true, ownerWhatsAppNumber: "573001112233", reportTimeZone: "America/Bogota", ownerDailyReportTime: "08:00", ownerWeeklyReportTime: "08:15" },
    nowProvider: () => new Date("2026-11-19T13:00:00.000Z"), runOnStart: false
  });
  await worker.runOnce(); worker.stop();
  assert.equal(sent.length, 0); assert.equal(audits.length, 0);
});

test("envía y audita un reporte diario cuando está habilitado", async () => {
  const sent = [], audits = [];
  const store = {
    listAudit: async () => [],
    getOperationalMetrics: async () => ({ inboundMessages: 3, outboundMessages: 2, escalationsOpened: 0, escalationsAnswered: 0, escalationsTimedOut: 0, escalationsPending: 0, websiteChecks: 0, websiteFailures: 0, webChangesPending: 0, webChangesApprovedPending: 0 }),
    audit: async item => audits.push(item)
  };
  const worker = startOwnerReportWorker({
    store, whatsapp: { sendText: async (...args) => sent.push(args) },
    config: { ownerReportsEnabled: true, ownerWhatsAppNumber: "573001112233", reportTimeZone: "America/Bogota", ownerDailyReportTime: "08:00", ownerWeeklyReportTime: "08:15" },
    nowProvider: () => new Date("2026-11-19T13:00:00.000Z"), runOnStart: false
  });
  await worker.runOnce(); worker.stop();
  assert.equal(sent.length, 1); assert.match(sent[0][1], /REPORTE OPERATIVO BLACK OPS/);
  assert.equal(audits[0].key, "daily:2026-11-19");
});

test("no programa envíos si falta consentimiento de configuración", async () => {
  let sent = 0;
  const worker = startOwnerReportWorker({ store: {}, whatsapp: { sendText: async () => sent++ }, config: { ownerReportsEnabled: false }, runOnStart: false });
  await worker.runOnce(); worker.stop(); assert.equal(sent, 0);
});
