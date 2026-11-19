// Reglas de negocio conservadoras para pagos y cancelaciones.
// Este módulo clasifica y orienta: no ejecuta cobros, reembolsos ni cambios en el calendario.

const RESERVATION_STATUSES = new Set([
  "pending_payment", "payment_reported", "scheduled",
  "completed", "cancelled", "expired", "overdue"
]);
const PAYMENT_STATUSES = new Set(["pending", "reported", "verified"]);

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function safeCop(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Solo un estado recibido de una fuente administrativa confiable, acompañado
 * de verifiedAt válido, puede clasificar un pago como verificado.
 */
export function classifyPaymentEvidence(payment = {}) {
  if (payment.serverStatus === "verified" &&
      validDate(payment.verifiedAt) &&
      safeCop(payment.amountCop)) {
    return {
      status: "verified",
      amountCop: payment.amountCop,
      verifiedAt: payment.verifiedAt,
      message: "Pago verificado por la fuente administrativa."
    };
  }

  if (payment.customerReported === true || payment.reportedAt || payment.receiptUrl) {
    return {
      status: "reported",
      amountCop: safeCop(payment.reportedAmountCop) ? payment.reportedAmountCop : null,
      message: "El cliente reportó el pago; falta validación del equipo."
    };
  }

  return {
    status: "pending",
    amountCop: null,
    message: "No existe evidencia de pago verificado."
  };
}

/**
 * Evalúa qué canal debe atender una cancelación. Nunca cancela la reserva.
 * La regla de devolución del anticipo se remite a revisión humana: el documento
 * funcional no define con precisión el punto temporal desde el que se cuentan
 * las 24 horas ni contempla aprobación automática de reembolsos.
 */
export function evaluateCancellationRequest({
  reservationStatus,
  requestedAt,
  paymentType = "unknown",
  reason = "customer_request"
} = {}) {
  if (!RESERVATION_STATUSES.has(reservationStatus)) {
    return { status: "invalid", action: "none", message: "Estado de reserva desconocido; no se puede orientar la solicitud." };
  }
  if (!validDate(requestedAt)) {
    return { status: "invalid", action: "none", message: "Fecha de solicitud inválida." };
  }
  if (!["full", "advance", "cash", "unknown"].includes(paymentType)) {
    return { status: "invalid", action: "none", message: "Tipo de pago desconocido." };
  }

  if (["cancelled", "expired", "completed"].includes(reservationStatus)) {
    return { status: "not_applicable", action: "none", refundReview: false, message: "La reserva ya no está en un estado cancelable por este flujo. El equipo debe revisar cualquier aclaración." };
  }

  if (reason === "weather" || reason === "force_majeure") {
    return {
      status: "human_review",
      action: "owner_reschedule",
      refundReview: paymentType !== "unknown",
      message: "El equipo debe validar la situación y coordinar una reprogramación sin costo. No se modifica el calendario automáticamente."
    };
  }

  if (reservationStatus === "scheduled") {
    return {
      status: "human_review",
      action: "contact_team",
      contact: "311 334 8774",
      refundReview: paymentType !== "unknown",
      message: "Las cancelaciones o cambios de reservas programadas se gestionan por WhatsApp con el equipo. No se ha cancelado la reserva."
    };
  }

  if (["pending_payment", "payment_reported", "overdue"].includes(reservationStatus)) {
    return {
      status: "self_service_guidance",
      action: "use_account",
      refundReview: paymentType === "full" || paymentType === "advance",
      message: "Según las reglas publicadas, esta etapa se gestiona desde la cuenta del cliente. El asistente no puede ejecutar la cancelación ni confirmar devoluciones."
    };
  }

  return { status: "human_review", action: "contact_team", contact: "311 334 8774", refundReview: true, message: "El equipo debe revisar el caso antes de cambiar el estado." };
}

export function evaluateRefundRequest({ paymentType = "unknown", paymentStatus = "pending", cancellationRequestedAt } = {}) {
  if (!["full", "advance", "cash", "unknown"].includes(paymentType) ||
      !PAYMENT_STATUSES.has(paymentStatus) ||
      !validDate(cancellationRequestedAt)) {
    return { status: "invalid", automaticApproval: false, message: "Datos de devolución incompletos o inválidos." };
  }

  if (paymentStatus !== "verified") {
    return { status: "not_eligible_for_refund_calculation", automaticApproval: false, message: "No se puede evaluar una devolución sin un pago verificado por el sistema." };
  }

  if (paymentType === "full") {
    return { status: "human_review", automaticApproval: false, message: "Las devoluciones de pagos completos requieren revisión del equipo." };
  }

  if (paymentType === "advance") {
    return { status: "human_review", automaticApproval: false, message: "El anticipo del 20% está sujeto a la regla publicada de cancelación dentro de las 24 horas de la reserva. El equipo debe validar el momento aplicable y aprobar cualquier devolución; no se calcula ni autoriza automáticamente." };
  }

  return { status: "human_review", automaticApproval: false, message: "El equipo debe revisar el medio de pago y las condiciones antes de determinar una devolución." };
}

export const reservationPolicyStatuses = Object.freeze([...RESERVATION_STATUSES]);


/**
 * Reconoce únicamente afirmaciones explícitas de pago ya realizado.
 * No interpreta preguntas sobre cómo pagar como comprobantes.
 */
export function parseCustomerPaymentReport(value) {
  const text = String(value || "").trim();
  if (!text || text.length > 2000) return null;
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const evidencePattern = /\b(?:ya pague|pago realizado|realice (?:la )?transferencia|hice (?:la )?transferencia|envie (?:el )?comprobante|adjunto (?:el )?comprobante|transferencia realizada|consignacion realizada)\b/;
  if (!evidencePattern.test(normalized)) return null;
  const amountMatch = normalized.match(/\b(?:cop\s*)?\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,9})(?:\s*(?:cop|pesos))?\b/);
  let reportedAmountCop = null;
  if (amountMatch) {
    const digits = amountMatch[1].replace(/[.,]/g, "");
    const amount = Number(digits);
    if (Number.isSafeInteger(amount) && amount >= 0) reportedAmountCop = amount;
  }
  return { reportedAmountCop, evidenceType: /comprobante/.test(normalized) ? "receipt_mentioned" : "payment_claim" };
}

export function customerPaymentReportMessage() {
  return "Recibimos tu aviso de pago. Importante: esto todavía NO significa que el pago esté confirmado. El equipo debe verificarlo en el sistema antes de marcar la reserva como pagada. Si aún no has enviado el soporte por el canal indicado por el equipo, comunícate al 311 334 8774.";
}

export function ownerPaymentReportMessage({ customer, reportedAmountCop } = {}) {
  const amount = Number.isSafeInteger(reportedAmountCop) && reportedAmountCop >= 0
    ? "Monto indicado por el cliente: $" + reportedAmountCop.toLocaleString("es-CO") + " COP. "
    : "";
  return "REPORTE DE PAGO PENDIENTE DE VERIFICACIÓN. Cliente: " + String(customer || "no disponible") + ". " + amount + "El cliente afirma haber realizado el pago. Verifica en la fuente administrativa; no marcar como pagado solo por este mensaje.";
}
