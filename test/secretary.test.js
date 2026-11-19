import test from "node:test";
import assert from "node:assert/strict";
import { parseOwnerReply } from "../src/agents/secretary.js";

test("parsea respuesta del dueño con ID y texto", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  assert.deepEqual(parseOwnerReply(`RESPONDER ${id}: Sí, tenemos disponibilidad; confirma la fecha con el equipo.`), {
    escalationId: id,
    answer: "Sí, tenemos disponibilidad; confirma la fecha con el equipo."
  });
});

test("rechaza comandos incompletos o con ID inválido", () => {
  assert.equal(parseOwnerReply("RESPONDER abc: respuesta"), null);
  assert.equal(parseOwnerReply("hola"), null);
});


import { createSecretary } from "../src/agents/secretary.js";

function webhookMessage(text, id = "wamid.payment-test") {
  return { entry: [{ changes: [{ value: { messages: [{ id, from: "573001112233", type: "text", text: { body: text } }] } }] }] }] };
}

function secretaryHarness({ ownerAlertsEnabled = false } = {}) {
  const sent = [];
  const audits = [];
  const seen = new Set();
  const store = {
    async addMessage(message) {
      if (seen.has(message.id)) return false;
      seen.add(message.id); return true;
    },
    async audit(event) { audits.push(event); },
    async listOwnerMemories() { return []; }
  };
  const subagents = { atencionWhatsApp: { async answer() { return { text: "respuesta genérica", needsOwner: false, urgent: false }; } } };
  const secretary = createSecretary({
    config: { ownerWhatsAppNumber: "573009998877", ownerAlertsEnabled },
    store,
    whatsapp: { async sendText(to, body) { sent.push({ to, body }); } },
    subagents
  });
  return { secretary, sent, audits };
}

test("el webhook responde preguntas de medios de pago sin invocar IA", async () => {
  const h = secretaryHarness();
  await h.secretary.handleWebhook(webhookMessage("¿Cómo puedo pagar por Nequi?"));
  assert.equal(h.sent.length, 1);
  assert.match(h.sent[0].body, /322 655 7479/);
  assert.equal(h.audits.some(item => item.type === "customer_payment_instructions_sent"), true);
});

test("el webhook separa el reporte de pago y alerta al dueño sin confirmar", async () => {
  const h = secretaryHarness({ ownerAlertsEnabled: true });
  await h.secretary.handleWebhook(webhookMessage("Ya pagué $50.000 COP, adjunto el comprobante"));
  assert.equal(h.sent.length, 2);
  assert.match(h.sent[0].body, /NO significa que el pago esté confirmado/);
  assert.match(h.sent[1].body, /PENDIENTE DE VERIFICACIÓN/);
  assert.equal(h.audits.some(item => item.type === "customer_payment_reported_unverified"), true);
  assert.equal(h.audits.some(item => item.type === "customer_payment_instructions_sent"), false);
});

test("el webhook no repite respuestas ante la misma notificación", async () => {
  const h = secretaryHarness();
  const payload = webhookMessage("¿Aceptan efectivo?", "wamid.duplicate-test");
  await h.secretary.handleWebhook(payload);
  await h.secretary.handleWebhook(payload);
  assert.equal(h.sent.length, 1);
  assert.equal(h.audits.filter(item => item.type === "customer_payment_instructions_sent").length, 1);
});
