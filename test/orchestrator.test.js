import test from "node:test";
import assert from "node:assert/strict";
import { classifyCustomerMessage, reviewCustomerAnswer } from "../src/agents/reviewer.js";
import { createOrchestrator } from "../src/agents/orchestrator.js";

test("clasifica lesiones como urgencia humana", () => {
  assert.deepEqual(classifyCustomerMessage("Me lesioné jugando y estoy sangrando").urgent, true);
});

test("clasifica pagos e inventario como datos que requieren al equipo", () => {
  assert.equal(classifyCustomerMessage("Ya hice el pago por Nequi").needsOwner, true);
  assert.equal(classifyCustomerMessage("¿Cuánto inventario queda?").intent, "private_business_data");
});

test("el revisor evita confirmar un pago o reserva no verificados", () => {
  const result = reviewCustomerAnswer("¿Me confirmas la reserva?", {
    text: "Tu reserva está confirmada y el pago aprobado.",
    needsOwner: false
  });
  assert.equal(result.needsOwner, true);
  assert.match(result.text, /no podemos confirmar/i);
});

test("el revisor escala una lesión y da instrucción segura", () => {
  const result = reviewCustomerAnswer("Sufrí una lesión en el campo", { text: "Qué pena", needsOwner: false });
  assert.equal(result.urgent, true);
  assert.match(result.text, /311 334 8774/);
});

test("el orquestador fuerza revisión y escalamiento en pagos", async () => {
  const orchestrator = createOrchestrator({
    support: { answer: async () => ({ text: "Puedes enviar el comprobante", needsOwner: false }) }
  });
  const result = await orchestrator.handleCustomerMessage("Ya pagué por Nequi");
  assert.equal(result.needsOwner, true);
  assert.equal(result.reviewed, true);
});

test("el orquestador captura errores del subagente", async () => {
  const orchestrator = createOrchestrator({ support: { answer: async () => { throw new Error("falló"); } } });
  const result = await orchestrator.handleCustomerMessage("Hola");
  assert.equal(result.needsOwner, true);
  assert.match(result.text, /311 334 8774/);
});
