const RESERVATION_STATUSES = new Set(["pending_payment","payment_reported","scheduled","completed","cancelled","expired","overdue"]);
const VERIFIED_PAYMENT_STATUSES = new Set(["verified","paid","approved","refunded"]);
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
  const verifiedPayments = payments.filter(item => VERIFIED_PAYMENT_STATUSES.has(item.status) && item.verifiedAt);
  const revenueCop = verifiedPayments.reduce((sum, item) => sum + money(item.amountCop), 0);
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
      verifiedRevenueCop: revenueCop
    },
    inventory: { items: inventory.length, atOrBelowMinimum: inventoryAlerts },
    limitations: [
      "Solo se cuentan estados de reserva reconocidos.",
      "Los ingresos suman únicamente pagos con estado verificado y verifiedAt.",
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
