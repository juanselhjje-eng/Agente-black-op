function localDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}
function shiftDate(key, days) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function zonedMidnightUtc(dateKey, timeZone) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(target));
  const p = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const represented = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return new Date(target - (represented - target));
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
    start: zonedMidnightUtc(first, timeZone),
    end: zonedMidnightUtc(shiftDate(last, 1), timeZone),
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
    "SOLICITUDES DE RESERVA", `• Solicitudes recibidas en el periodo: ${m.reservationRequestsCreated}`,
    `• Pendientes de gestión actualmente: ${m.reservationRequestsPending}`,
    `• Cerradas o rechazadas en el periodo: ${m.reservationRequestsClosed}`, "",
    "SOLICITUDES DE CAMBIOS WEB", `• Pendientes de revisión: ${m.webChangesPending}`,
    `• Aprobadas pendientes de integración: ${m.webChangesApprovedPending}`, "",
    "PENDIENTES DE INTEGRACIÓN",
    "• Ventas, pagos, inventario y reservas privadas: sin reporte; falta API autenticada y permiso de lectura.", "",
    "Nota: este informe refleja únicamente eventos registrados por el agente. No equivale a un cierre contable ni confirma ventas o pagos."
  ];
  return { ...range, metrics: m, text: lines.join("\n") };
}
