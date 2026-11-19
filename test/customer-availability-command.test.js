import test from "node:test";
import assert from "node:assert/strict";
import { parseCustomerAvailabilityRequest } from "../src/agents/secretary.js";

test("interpreta solicitud de disponibilidad con fecha ISO",()=>{
  assert.deepEqual(parseCustomerAvailabilityRequest("Quiero consultar disponibilidad 2026-11-20"),{date:"2026-11-20",players:2,packageType:"standard"});
});
test("interpreta fecha, cantidad y paquete en lenguaje habitual",()=>{
  assert.deepEqual(parseCustomerAvailabilityRequest("Quiero reservar para el 2026-11-20 para 6 personas tactical"),{date:"2026-11-20",players:6,packageType:"tactical"});
  assert.deepEqual(parseCustomerAvailabilityRequest("Horarios 2026-11-20 4 jugadores elite"),{date:"2026-11-20",players:4,packageType:"elite"});
});
test("rechaza fecha imposible, cantidad fuera del rango y mensajes sin fecha explícita",()=>{
  assert.equal(parseCustomerAvailabilityRequest("disponibilidad 2026-02-30"),null);
  assert.equal(parseCustomerAvailabilityRequest("reservar 2026-11-20 1 persona"),null);
  assert.equal(parseCustomerAvailabilityRequest("reservar 2026-11-20 para 11 jugadores"),null);
  assert.equal(parseCustomerAvailabilityRequest("¿Tienen disponibilidad mañana?"),null);
});
