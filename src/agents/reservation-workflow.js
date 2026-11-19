// Flujo de intake: nunca convierte una solicitud en una reserva confirmada.
export function parseCustomerReservationRequest(value) {
  const match = String(value || "").trim().match(/^SOLICITAR RESERVA\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}):([0-5]\d)\s+(\d{1,2})\s+(standard|tactical|elite)$/i);
  if (!match) return null;
  const date = match[1];
  const timestamp = Date.parse(date + "T00:00:00.000Z");
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const players = Number(match[4]);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
  if (hour < 8 || hour > 21 || (hour === 21 && minute !== 0) || minute % 30 !== 0) return null;
  if (!Number.isInteger(players) || players < 2 || players > 10) return null;
  return { date, time: match[2] + ":" + match[3], players, packageType: match[5].toLowerCase() };
}

export function buildReservationRequest(input, { customer, sourceMessage = "" } = {}) {
  const parsed = typeof input === "string" ? parseCustomerReservationRequest(input) : input;
  if (!parsed) return { status: "invalid", message: "Formato inválido. Usa SOLICITAR RESERVA AAAA-MM-DD HH:MM JUGADORES PAQUETE." };
  if (!customer || !/^\+?\d{8,15}$/.test(String(customer))) return { status: "invalid", message: "No se pudo validar el contacto del cliente." };
  return {
    status: "pending_owner_review",
    customer: String(customer),
    date: parsed.date,
    time: parsed.time,
    players: parsed.players,
    packageType: parsed.packageType,
    sourceMessage: String(sourceMessage).slice(0, 200),
    createdAt: new Date().toISOString(),
    confirmation: "request_only"
  };
}
export function reservationRequestCustomerMessage(request) {
  return "Recibimos tu solicitud para el " + request.date + " a las " + request.time + ", paquete " + request.packageType + ", " + request.players + " jugadores. Código: " + request.id.slice(0, 8) + ". Esta solicitud NO es una reserva confirmada ni bloquea el horario. El equipo debe verificar el calendario oficial y formalizarla. WhatsApp: 311 334 8774.";
}
export function reservationRequestOwnerMessage(request) {
  return "SOLICITUD DE RESERVA PENDIENTE " + request.id + "\nCliente: " + request.customer + "\nFecha/hora: " + request.date + " " + request.time + "\nPaquete: " + request.packageType + " | Jugadores: " + request.players + "\nVerifica el calendario oficial antes de aceptar. No está reservada.";
}


const RESERVATION_REQUEST_TRANSITIONS = Object.freeze({
  pending_owner_review: ["owner_contacted", "rejected", "cancelled_by_customer", "closed"],
  owner_contacted: ["rejected", "cancelled_by_customer", "closed"],
  rejected: [],
  cancelled_by_customer: [],
  closed: []
});
export function transitionReservationRequest(request, nextStatus, details = {}) {
  if (!request || !Object.hasOwn(RESERVATION_REQUEST_TRANSITIONS, request.status)) return null;
  if (!RESERVATION_REQUEST_TRANSITIONS[request.status].includes(nextStatus)) return null;
  return { ...request, ...details, status: nextStatus, updatedAt: new Date().toISOString() };
}
export function parseCustomerReservationCancellation(value) {
  const match = String(value || "").trim().match(/^CANCELAR SOLICITUD\s+([0-9a-f-]{8,36})$/i);
  return match ? match[1].toLowerCase() : null;
}
export function parseOwnerReservationRejection(value) {
  const match = String(value || "").trim().match(/^RECHAZAR SOLICITUD\s+([0-9a-f-]{8,36})(?:\s*:\s*(.{1,300}))?$/i);
  return match ? { idPrefix: match[1].toLowerCase(), reason: (match[2] || "El equipo no pudo aceptar esta solicitud.").trim() } : null;
}
export function reservationRequestStatusMessage(request) {
  if (request.status === "rejected") return "El equipo revisó tu solicitud " + request.id.slice(0,8) + " y no pudo aceptarla. Motivo: " + (request.resolutionNote || "consulta directamente con el equipo") + ". Puedes comunicarte al 311 334 8774 para revisar alternativas.";
  if (request.status === "cancelled_by_customer") return "Tu solicitud " + request.id.slice(0,8) + " fue cancelada. Recuerda que esto no afecta reservas confirmadas por otros canales.";
  if (request.status === "closed") return "La solicitud " + request.id.slice(0,8) + " fue cerrada por el equipo. Para más información, comunícate al 311 334 8774.";
  return "La solicitud " + request.id.slice(0,8) + " fue actualizada. Comunícate al equipo al 311 334 8774.";
}
