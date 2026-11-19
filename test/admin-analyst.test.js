import test from "node:test";
import assert from "node:assert/strict";
import { createAdminAnalyst, summarizeAdminSnapshot } from "../src/agents/admin-analyst.js";

test("distingue reservas por estado y pagos reportados de pagos verificados", () => {
  const summary = summarizeAdminSnapshot({
    source: "test-api",
    asOf: "2026-11-19T12:00:00Z",
    reservations: [
      { status: "scheduled" }, { status: "pending_payment" }, { status: "invented" }
    ],
    payments: [
      { status: "reported", amountCop: 50000 },
      { status: "verified", amountCop: 35000, verifiedAt: "2026-11-19T10:00:00Z" },
      { status: "paid", amountCop: 20000 }
    ],
    inventory: [{ sku: "BALLS", name: "Bolas", quantity: 4, minimum: 5 }]
  });
  assert.equal(summary.reservations.total, 2);
  assert.equal(summary.reservations.byStatus.scheduled, 1);
  assert.equal(summary.payments.reportedUnverifiedCount, 1);
  assert.equal(summary.payments.verifiedRevenueCop, 35000);
  assert.equal(summary.inventory.atOrBelowMinimum.length, 1);
});

test("no acepta montos negativos o decimales como ingresos", () => {
  const summary = summarizeAdminSnapshot({ payments: [
    { status: "verified", amountCop: -100, verifiedAt: "2026-11-19" },
    { status: "verified", amountCop: 10.5, verifiedAt: "2026-11-19" }
  ] });
  assert.equal(summary.payments.verifiedRevenueCop, 0);
});

test("el analista indica que no está configurado sin proveedor privado", async () => {
  const analyst = createAdminAnalyst();
  assert.equal(analyst.isConfigured(), false);
  assert.equal((await analyst.getSummary({})).status, "unavailable");
});

test("el analista calcula resumen desde proveedor autenticado inyectado", async () => {
  const analyst = createAdminAnalyst({ provider: { getSnapshot: async () => ({
    payments: [{ status: "verified", amountCop: 60000, verifiedAt: "2026-11-19" }]
  }) } });
  const result = await analyst.getSummary({ period: "daily" });
  assert.equal(result.status, "completed");
  assert.equal(result.summary.payments.verifiedRevenueCop, 60000);
});
