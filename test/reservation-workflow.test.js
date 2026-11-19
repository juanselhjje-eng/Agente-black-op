import test from "node:test";
import assert from "node:assert/strict";
import { parseCustomerReservationRequest } from "../src/agents/reservation-workflow.js";

test("acepta solicitudes completas en intervalos de media hora", () => {
  assert.deepEqual(parseCustomerReservationRequest("SOLICITAR RESERVA 2026-11-20 10:30 4 tactical"), { date: "2026-11-20", time: "10:30", players: 4, packageType: "tactical" });
});
test("rechaza fechas, horas, intervalos y cantidades inválidas", () => {
  for (const value of [
    "SOLICITAR RESERVA 2026-02-30 10:00 4 standard",
    "SOLICITAR RESERVA 2026-11-20 07:30 4 standard",
    "SOLICITAR RESERVA 2026-11-20 22:00 4 standard",
    "SOLICITAR RESERVA 2026-11-20 10:15 4 standard",
    "SOLICITAR RESERVA 2026-11-20 10:00 1 standard",
    "SOLICITAR RESERVA 2026-11-20 10:00 11 standard",
    "SOLICITAR RESERVA 2026-11-20 10:00 4 premium",
    "quiero reservar mañana"
  ]) assert.equal(parseCustomerReservationRequest(value), null);
});
