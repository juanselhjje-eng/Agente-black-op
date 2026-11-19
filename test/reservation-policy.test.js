import test from "node:test";
import assert from "node:assert/strict";
import { classifyPaymentEvidence, evaluateCancellationRequest, evaluateRefundRequest, reservationPolicyStatuses } from "../src/agents/reservation-policy.js";

const at = "2026-11-19T18:00:00.000Z";

test("solo una verificación administrativa válida reconoce un pago", () => {
  assert.equal(classifyPaymentEvidence({ customerReported: true, reportedAmountCop: 50000 }).status, "reported");
  assert.equal(classifyPaymentEvidence({ serverStatus: "verified", verifiedAt: at, amountCop: 50000 }).status, "verified");
  assert.equal(classifyPaymentEvidence({ serverStatus: "verified", verifiedAt: "ayer", amountCop: 50000 }).status, "pending");
  assert.equal(classifyPaymentEvidence({ serverStatus: "verified", verifiedAt: at, amountCop: -1 }).status, "pending");
});

test("clasifica los estados canónicos y no inventa estados", () => {
  assert.ok(reservationPolicyStatuses.includes("scheduled"));
  assert.equal(evaluateCancellationRequest({ reservationStatus: "invented", requestedAt: at }).status, "invalid");
  assert.equal(evaluateCancellationRequest({ reservationStatus: "scheduled", requestedAt: at }).action, "contact_team");
});

test("las reservas pendientes reciben orientación de autoservicio, sin ejecutar cancelación", () => {
  const result = evaluateCancellationRequest({ reservationStatus: "pending_payment", requestedAt: at });
  assert.equal(result.action, "use_account");
  assert.match(result.message, /no puede ejecutar/i);
});

test("clima o fuerza mayor requieren revisión para reprogramar sin costo", () => {
  const result = evaluateCancellationRequest({ reservationStatus: "scheduled", requestedAt: at, reason: "weather", paymentType: "full" });
  assert.equal(result.action, "owner_reschedule");
  assert.equal(result.refundReview, true);
});

test("reservas completadas, vencidas o canceladas no se cancelan de nuevo", () => {
  for (const reservationStatus of ["completed", "expired", "cancelled"]) {
    assert.equal(evaluateCancellationRequest({ reservationStatus, requestedAt: at }).status, "not_applicable");
  }
});

test("ninguna devolución se aprueba automáticamente", () => {
  for (const paymentType of ["full", "advance", "cash"]) {
    const result = evaluateRefundRequest({ paymentType, paymentStatus: "verified", cancellationRequestedAt: at });
    assert.equal(result.automaticApproval, false);
    assert.equal(result.status, "human_review");
  }
});

test("no calcula devolución sobre pagos no verificados ni fechas inválidas", () => {
  assert.equal(evaluateRefundRequest({ paymentType: "full", paymentStatus: "reported", cancellationRequestedAt: at }).status, "not_eligible_for_refund_calculation");
  assert.equal(evaluateRefundRequest({ paymentType: "advance", paymentStatus: "verified", cancellationRequestedAt: "hoy" }).status, "invalid");
});


import { parseCustomerPaymentReport, customerPaymentReportMessage, ownerPaymentReportMessage } from "../src/agents/reservation-policy.js";

test("reconoce un reporte explícito de pago, no preguntas de medios de pago", () => {
  assert.deepEqual(parseCustomerPaymentReport("Ya pagué $50.000 COP, adjunto el comprobante"), {
    reportedAmountCop: 50000,
    evidenceType: "receipt_mentioned"
  });
  assert.equal(parseCustomerPaymentReport("¿Cómo puedo pagar por Nequi?"), null);
  assert.equal(parseCustomerPaymentReport("Quiero conocer los precios"), null);
});

test("no acepta mensajes excesivos y conserva reportes sin monto", () => {
  assert.equal(parseCustomerPaymentReport("ya pague " + "x".repeat(2000)), null);
  assert.deepEqual(parseCustomerPaymentReport("Realicé la transferencia"), {
    reportedAmountCop: null,
    evidenceType: "payment_claim"
  });
});

test("los mensajes nunca confirman automáticamente un pago", () => {
  assert.match(customerPaymentReportMessage(), /NO significa que el pago esté confirmado/);
  assert.match(ownerPaymentReportMessage({ customer: "573001234567", reportedAmountCop: 50000 }), /PENDIENTE DE VERIFICACIÓN/);
});


import { isCustomerPaymentInfoRequest, customerPaymentInstructionsMessage } from "../src/agents/reservation-policy.js";

test("reconoce preguntas sobre medios de pago sin confundirlas con reportes", () => {
  assert.equal(isCustomerPaymentInfoRequest("¿Cómo puedo pagar por Nequi?"), true);
  assert.equal(isCustomerPaymentInfoRequest("¿Aceptan efectivo?"), true);
  assert.equal(isCustomerPaymentInfoRequest("Ya pagué $50.000 COP"), false);
  assert.equal(isCustomerPaymentInfoRequest("¿Cuáles son los horarios?"), false);
  assert.equal(isCustomerPaymentInfoRequest("x".repeat(1001)), false);
});

test("las instrucciones informan medios y condiciones sin confirmar reservas", () => {
  const message = customerPaymentInstructionsMessage();
  assert.match(message, /322 655 7479/);
  assert.match(message, /anticipo del 20%/);
  assert.match(message, /30 minutos/);
  assert.match(message, /no confirma automáticamente la reserva/i);
});
