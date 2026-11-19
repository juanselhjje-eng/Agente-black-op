import test from "node:test";
import assert from "node:assert/strict";
import { buildOwnerReport, getReportRange } from "../src/reports/owner-report.js";

test("calcula el rango diario en hora de Bogotá", () => {
  const range = getReportRange("daily", new Date("2026-11-19T15:00:00Z"));
  assert.equal(range.start.toISOString(), "2026-11-19T05:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-11-20T05:00:00.000Z");
});
test("la semana empieza el lunes y termina antes del lunes siguiente", () => {
  const range = getReportRange("weekly", new Date("2026-11-19T15:00:00Z"));
  assert.equal(range.start.toISOString(), "2026-11-16T05:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-11-23T05:00:00.000Z");
});
test("genera resumen sin inventar datos comerciales", async () => {
  const store = { getOperationalMetrics: async () => ({
    inboundMessages: 12, outboundMessages: 10, escalationsOpened: 3, escalationsAnswered: 1,
    escalationsTimedOut: 1, escalationsPending: 1, websiteChecks: 20, websiteFailures: 2,
    webChangesPending: 2, webChangesApprovedPending: 1
  }) };
  const report = await buildOwnerReport(store, { now: new Date("2026-11-19T15:00:00Z") });
  assert.match(report.text, /Disponibilidad observada: 90%/);
  assert.match(report.text, /Ventas, pagos, inventario y reservas privadas: sin reporte/);
  assert.match(report.text, /Mensajes recibidos: 12/);
});
test("rechaza periodos no soportados", () => {
  assert.throws(() => getReportRange("monthly"), /daily o weekly/);
});
