const BOGOTA_OFFSET = "-05:00";
function localDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}
function shiftDate(key, days) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function getReportRange(period = "daily", now = new Date(), timeZone = "America/Bogota") {
  if (!["daily", "weekly"].includes(period)) throw new TypeError("El periodo debe ser daily o weekly.");
  const p = localDateParts(now, timeZone);
  const today = `${p.year}-${p.month}-${p.day}`;
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = shiftDate(today, -(weekday === 0 ? 6 : weekday - 1));
  const first = period === "daily" ? today : monday;
  const last = period === "daily" ? today : shiftDate(monday, 6);
  return {
    start: new Date(`${first}T00:00:00${BOGOTA_OFFSET}`),
    end: new Date(`${shiftDate(last, 1)}T00:00:00${BOGOTA_OFFSET}`),
    label: period === "daily" ? `Día ${first}` : `Semana ${first} a ${last}`,
    timeZone
  };
}
export async function buildOwnerReport(store, { period = "daily", now = new Date(), timeZone = "America/Bogota" } = {}) {
  const range = getReportRange(period, now, timeZone);
  const m = await store.getOperationalMetrics(range.start, range.end);
  const uptime = m.websiteChecks ? Math.round(((m.websiteChecks - m.websiteFailures) / m.websiteChecks) * 1000) / 10 : null;
  const lines = [
    `REPORTE OPERATIVO BLACK OPS — ${range.label}`, "",
    "ATENCIÓN", `• Mensajes recibidos: ${m.inboundMessages}`, `• Respuestas enviadas: ${m.outboundMessages}`, "",
    "GESTIÓN DEL EQUIPO", `• Consultas escaladas al dueño: ${m.escalationsOpened}`,
    `• Resueltas por el dueño: ${m.escalationsAnswered}`, `• Vencidas por tiempo de espera: ${m.escalationsTimedOut}`,
    `• Pendientes actualmente: ${m.escalationsPending}`, "",
    "SUPERVISIÓN WEB", `• Comprobaciones realizadas: ${m.websiteChecks}`,
    `• Comprobaciones fallidas: ${m.websiteFailures}`, `• Disponibilidad observada: ${uptime === null ? "Sin datos" : uptime + "%"}`, "",
    "SOLICITUDES DE CAMBIOS WEB", `• Pendientes de revisión: ${m.webChangesPending}`,
    `• Aprobadas pendientes de integración: ${m.webChangesApprovedPending}`, "",
    "PENDIENTES DE INTEGRACIÓN",
    "• Ventas, pagos, inventario y reservas privadas: sin reporte; falta API autenticada y permiso de lectura.", "",
    "Nota: este informe refleja únicamente eventos registrados por el agente. No equivale a un cierre contable ni confirma ventas o pagos."
  ];
  return { ...range, metrics: m, text: lines.join("\n") };
}
