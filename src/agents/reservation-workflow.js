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
