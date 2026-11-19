import test from "node:test";
import assert from "node:assert/strict";
import { planPublicAvailability } from "../src/agents/availability-planner.js";

const empty = { busy: [], disabled: [], blocked: [] };
test("genera candidatos cada 30 minutos y aplica duración y limpieza", () => {
  const result = planPublicAvailability({ from:"2026-11-20", packageType:"standard", players:4, publicAvailability:empty });
  assert.equal(result.status,"verified_against_public_blocks");
  assert.equal(result.slots[0].time,"08:00");
  assert.equal(result.slots[0].endsAt,"09:00");
  assert.equal(result.slots[1].time,"08:30");
  assert.equal(result.slots.at(-1).time,"22:00");
});
test("bloqueo colindante al margen de limpieza excluye el horario", () => {
  const result = planPublicAvailability({ from:"2026-11-20", publicAvailability:{busy:[{start:"2026-11-20T09:00:00",end:"2026-11-20T10:00:00"}],disabled:[],blocked:[]} });
  assert.ok(!result.slots.some(slot=>slot.time==="08:00"));
});
test("bloqueos de varios tipos se respetan", () => {
  const result = planPublicAvailability({ from:"2026-11-20", publicAvailability:{busy:[],disabled:[],blocked:[{from:"2026-11-20T08:00:00",to:"2026-11-20T10:00:00"}]} });
  assert.ok(!result.slots.some(slot=>slot.time==="08:00"));
  assert.ok(result.slots.some(slot=>slot.time==="10:00"));
});
test("no declara disponibilidad si el contrato es desconocido", () => {
  const result = planPublicAvailability({ from:"2026-11-20", publicAvailability:{events:[]} });
  assert.equal(result.status,"unverified"); assert.equal(result.slots.length,0);
});
test("valida fechas, rango, jugadores y paquete", () => {
  assert.throws(()=>planPublicAvailability({from:"20-11-2026",publicAvailability:empty}),/Rango/);\n  assert.throws(()=>planPublicAvailability({from:"2026-99-99",publicAvailability:empty}),/Fecha calendario/);
  assert.throws(()=>planPublicAvailability({from:"2026-11-20",to:"2027-01-01",publicAvailability:empty}),/31 días/);
  assert.throws(()=>planPublicAvailability({from:"2026-11-20",players:1,publicAvailability:empty}),/2 y 10/);
  assert.throws(()=>planPublicAvailability({from:"2026-11-20",packageType:"gold",publicAvailability:empty}),/Paquete/);
});
test("respeta duración elite y horario de cierre", () => {
  const result=planPublicAvailability({from:"2026-11-20",packageType:"elite",publicAvailability:empty});
  assert.equal(result.slots.at(-1).time,"21:00");
  assert.equal(result.slots.at(-1).endsAt,"22:30");
});
