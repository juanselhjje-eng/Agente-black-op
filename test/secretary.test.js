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
