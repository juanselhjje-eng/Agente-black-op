const URGENT = /\b(lesi[oó]n|lesion|herid[ao]|sangr|fractur|accidente|emergencia|urgente|amenaz|intoxic|desmayo|queja grave)\b/i;
const PAYMENT_OR_BOOKING = /\b(pag[oa] (?:confirmad[oa]|verificad[oa])|reserva (?:confirmada|agendada)|cupo (?:confirmado|garantizado)|transacci[oó]n aprobada)\b/i;
const CONTACT = "Para atención directa, escríbenos al 311 334 8774.";

export function classifyCustomerMessage(message) {
  const text = String(message || "").trim();
  if (URGENT.test(text)) return { intent: "urgent_human", urgent: true, needsOwner: true };
  if (/\b(disponibilidad|hay cupo|reservar|reserva|agendar|fecha|horario)\b/i.test(text)) return { intent: "booking_guidance", urgent: false, needsOwner: true };
  if (/\b(precio|precios|paquete|paquetes|valor|cu[aá]nto cuesta)\b/i.test(text)) return { intent: "pricing", urgent: false, needsOwner: false };
  if (/\b(pagu[eé]|pago|nequi|comprobante|transferencia|reembolso|devoluci[oó]n)\b/i.test(text)) return { intent: "payment", urgent: false, needsOwner: true };
  if (/\b(inventario|stock|existencias|ventas del d[ií]a|ingresos|facturaci[oó]n)\b/i.test(text)) return { intent: "private_business_data", urgent: false, needsOwner: true };
  if (/\b(cambio|cancelar|cancelaci[oó]n|modificar)\b/i.test(text) && /\b(reserva|fecha|hora|jugadores)\b/i.test(text)) return { intent: "reservation_change", urgent: false, needsOwner: true };
  return { intent: "general", urgent: false, needsOwner: false };
}

export function reviewCustomerAnswer(message, result) {
  const classification = classifyCustomerMessage(message);
  const reviewed = { text: String(result?.text || "").trim(), needsOwner: Boolean(result?.needsOwner), urgent: Boolean(result?.urgent), intent: classification.intent, reviewed: true };
  if (classification.urgent || reviewed.urgent) {
    return { ...reviewed, text: "Lamentamos lo ocurrido. Por seguridad, detén la actividad y busca apoyo inmediato del personal del campo. Nuestro equipo debe atender este caso directamente. " + CONTACT, urgent: true, needsOwner: true };
  }
  if (classification.needsOwner) {
    reviewed.needsOwner = true;
    if (!reviewed.text || PAYMENT_OR_BOOKING.test(reviewed.text)) {
      reviewed.text = "Para confirmar pagos, cambios de reserva o información privada necesitamos validación del equipo. No podemos confirmar esa operación por este chat automático. " + CONTACT;
    }
  }
  if (!reviewed.text) reviewed.text = "No pude confirmar esa información. " + CONTACT;
  if (PAYMENT_OR_BOOKING.test(reviewed.text) && !classification.needsOwner) {
    reviewed.text = "No puedo confirmar pagos ni reservas desde este chat. " + CONTACT;
    reviewed.needsOwner = true;
  }
  return reviewed;
}
