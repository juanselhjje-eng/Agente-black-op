import test from "node:test";
import assert from "node:assert/strict";
import { parseAvailabilityCommand } from "../src/agents/secretary.js";

test("interpreta disponibilidad con valores por defecto", () => {
  assert.deepEqual(parseAvailabilityCommand("DISPONIBILIDAD: 2026-11-20"), { date:"2026-11-20", packageType:"standard", players:2 });
});
test("interpreta paquete y jugadores sin distinguir mayúsculas", () => {
  assert.deepEqual(parseAvailabilityCommand("disponibilidad: 2026-11-20 ELITE 8"), { date:"2026-11-20", packageType:"elite", players:8 });
});
test("rechaza comandos incompletos o fuera del rango de reserva normal", () => {
  assert.equal(parseAvailabilityCommand("DISPONIBILIDAD:"),null);
  assert.equal(parseAvailabilityCommand("DISPONIBILIDAD: 20-11-2026"),null);
  assert.equal(parseAvailabilityCommand("DISPONIBILIDAD: 2026-11-20 1"),null);
  assert.equal(parseAvailabilityCommand("DISPONIBILIDAD: 2026-11-20 standard 11"),null);
  assert.equal(parseAvailabilityCommand("DISPONIBILIDAD: 2026-11-20 premium 4"),null);
});
