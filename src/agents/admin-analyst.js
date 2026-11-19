const RESERVATION_STATUSES = new Set(["pending_payment","payment_reported","scheduled","completed","cancelled","expired","overdue"]);
const COLLECTED_PAYMENT_STATUSES = new Set(["verified","paid","approved"]);
const money = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

function isoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function summarizeAdminSnapshot(snapshot = {}) {
  const reservations = Array.isArray(snapshot.reservations) ? snapshot.reservations : [];
  const payments = Array.isArray(snapshot.payments) ? snapshot.payments : [];
  const inventory = Array.isArray(snapshot.inventory) ? snapshot.inventory : [];
  const normalizedReservations = reservations.filter(item => RESERVATION_STATUSES.has(item.status));
  const verifiedPayments = payments.filter(item => COLLECTED_PAYMENT_STATUSES.has(item.status) && isoDate(item.verifiedAt));
  const refundedPayments = payments.filter(item => item.status === "refunded" && isoDate(item.refundedAt));
  const sumSafeMoney = items => items.reduce((result, item) => {
    const amount = money(item.amountCop);
    if (!Number.isSafeInteger(result.total + amount)) { result.overflowCount += 1; return result; }
    result.total += amount;
    return result;
  }, { total: 0, overflowCount: 0 });
  const collected = sumSafeMoney(verifiedPayments);
  const refunds = sumSafeMoney(refundedPayments);
  const reportedPayments = payments.filter(item => item.status === "reported").length;
  const inventoryAlerts = inventory.filter(item => Number.isFinite(item.quantity) && Number.isFinite(item.minimum) && item.quantity <= item.minimum)
    .map(item => ({ sku: String(item.sku || "").slice(0, 80), name: String(item.name || item.sku || "Artículo").slice(0, 120), quantity: item.quantity, minimum: item.minimum }));
  const byStatus = Object.fromEntries([...RESERVATION_STATUSES].map(status => [status, normalizedReservations.filter(item => item.status === status).length]));
  const sourceAsOf = isoDate(snapshot.asOf);
  return {
    source: String(snapshot.source || "unspecified").slice(0, 100),
    asOf: sourceAsOf?.toISOString() || null,
    reservations: { total: normalizedReservations.length, byStatus },
    payments: {
      records: payments.length,
      verifiedCount: verifiedPayments.length,
      reportedUnverifiedCount: reportedPayments,
      verifiedCollectedCop: collected.total,
      refundedCount: refundedPayments.length,
      refundedAmountCop: refunds.total,
      amountOverflowCount: collected.overflowCount + refunds.overflowCount
    },
    inventory: { items: inventory.length, atOrBelowMinimum: inventoryAlerts },
    limitations: [
      "Solo se cuentan estados de reserva reconocidos.",
      "Los recaudos confirmados incluyen solo pagos verificados, pagados o aprobados con verifiedAt válido.",
      "Los reembolsos se reportan por separado y nunca se suman como recaudo.",
      "Los importes que producirían desbordamiento de enteros seguros se excluyen y se contabilizan como anomalía.",
      "Los pagos reportados no se consideran ingresos confirmados.",
      "No se calculan impuestos, costos, utilidad ni ventas sin datos de origen."
    ]
  };
}

export function createAdminAnalyst({ provider } = {}) {
  return {
    isConfigured: () => Boolean(provider?.getSnapshot),
    async getSummary(range) {
      if (!provider?.getSnapshot) return { status: "unavailable", message: "Falta conectar una API administrativa autenticada de reservas, pagos e inventario." };
      const snapshot = await provider.getSnapshot(range);
      if (!snapshot || typeof snapshot !== "object") throw new TypeError("La fuente administrativa devolvió una respuesta inválida.");
      return { status: "completed", summary: summarizeAdminSnapshot(snapshot) };
    }
  };
}
