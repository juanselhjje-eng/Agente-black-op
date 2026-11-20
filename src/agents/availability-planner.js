const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PACKAGES = Object.freeze({
  standard: { minutes: 60, priceCop: 35000, balls: 100 },
  tactical: { minutes: 90, priceCop: 50000, balls: 150 },
  elite: { minutes: 120, priceCop: 60000, balls: 200 }
});
const START_KEYS = ["start","startAt","startsAt","from","start_time","startTime","dateStart"];
const END_KEYS = ["end","endAt","endsAt","to","end_time","endTime","dateEnd"];

function minuteOfDay(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/(?:T| )(\d{2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}
function dateOf(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match && DAY.test(match[1]) ? match[1] : null;
}
function readIntervals(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { known: false, intervals: [] };
  const keys = ["busy","disabled","blocked"];
  if (!keys.every(key => Object.hasOwn(payload, key))) return { known: false, intervals: [] };
  const intervals = [];
  for (const key of keys) {
    const value = payload[key];
    // The live API currently returns empty maps for busy/blocked and an array for disabled.
    // Only an empty map is safe to interpret as "no entries"; unknown non-empty maps stay unverified.
    const list = Array.isArray(value) ? value : (
      value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0
        ? []
        : null
    );
    if (!list) return { known: false, intervals: [] };
    for (const item of list) {
      if (!item || typeof item !== "object") return { known: false, intervals: [] };
      const startKey = START_KEYS.find(name => item[name] !== undefined);
      const endKey = END_KEYS.find(name => item[name] !== undefined);
      if (!startKey || !endKey) return { known: false, intervals: [] };
      const startDate = dateOf(item[startKey]), endDate = dateOf(item[endKey]);
      const startMinute = minuteOfDay(item[startKey]), endMinute = minuteOfDay(item[endKey]);
      if (!startDate || !endDate || startMinute === null || endMinute === null) return { known: false, intervals: [] };
      const start = Date.parse(startDate + "T00:00:00Z") / 60000 + startMinute;
      const end = Date.parse(endDate + "T00:00:00Z") / 60000 + endMinute;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { known: false, intervals: [] };
      intervals.push({ start, end, source: key });
    }
  }
  return { known: true, intervals };
}
function validDateRange(from, to) {
  if (!DAY.test(from) || !DAY.test(to) || from > to) throw new TypeError("Rango de fechas inválido; usa YYYY-MM-DD.");
  const start = Date.parse(from + "T00:00:00Z");
  const end = Date.parse(to + "T00:00:00Z");
  if (!Number.isFinite(start) || !Number.isFinite(end) || new Date(start).toISOString().slice(0,10) !== from || new Date(end).toISOString().slice(0,10) !== to) throw new TypeError("Fecha calendario inexistente.");
  if ((end - start) / 86400000 > 30) throw new RangeError("Consulta máximo 31 días por planificación.");
  return { start, end };
}

export function planPublicAvailability({ from, to = from, packageType = "standard", players = 2, publicAvailability, openingHour = 8, closingHour = 23, cleanupMinutes = 30 }) {
  const range = validDateRange(from, to);
  const selectedPackage = PACKAGES[packageType];
  if (!selectedPackage) throw new TypeError("Paquete no reconocido. Usa standard, tactical o elite.");
  if (!Number.isInteger(players) || players < 2 || players > 10) throw new RangeError("La reserva normal requiere entre 2 y 10 jugadores; partidas abiertas se consultan por separado.");
  if (!Number.isInteger(openingHour) || !Number.isInteger(closingHour) || openingHour < 0 || closingHour > 24 || openingHour >= closingHour) throw new TypeError("Horario de operación inválido.");
  if (!Number.isInteger(cleanupMinutes) || cleanupMinutes < 0 || cleanupMinutes > 180) throw new TypeError("Margen de limpieza inválido.");
  const parsed = readIntervals(publicAvailability);
  if (!parsed.known) return { status: "unverified", message: "La API no devolvió el formato de bloqueos esperado. No se puede afirmar que haya horarios libres.", slots: [], package: packageType, players, range: { from, to } };
  const busy = parsed.intervals;
  const slots = [];
  const currentDay = typeof publicAvailability?.today === "string" && DAY.test(publicAvailability.today)
    ? publicAvailability.today
    : null;
  const currentMinute = Number.isInteger(publicAvailability?.nowMinute) && publicAvailability.nowMinute >= 0 && publicAvailability.nowMinute < 1440
    ? publicAvailability.nowMinute
    : null;
  for (let day = range.start; day <= range.end; day += 86400000) {
    const date = new Date(day).toISOString().slice(0,10);
    for (let minute = openingHour * 60; minute + selectedPackage.minutes <= closingHour * 60; minute += 30) {
      // Do not offer start times that have already passed on the API's current local day.
      if (date === currentDay && currentMinute !== null && minute <= currentMinute) continue;
      const start = day / 60000 + minute;
      const end = start + selectedPackage.minutes;
      const protectedEnd = end + cleanupMinutes;
      const conflict = busy.some(interval => start < interval.end && protectedEnd > interval.start);
      if (!conflict) slots.push({ date, time: String(Math.floor(minute / 60)).padStart(2,"0") + ":" + String(minute % 60).padStart(2,"0"), endsAt: String(Math.floor((minute + selectedPackage.minutes) / 60)).padStart(2,"0") + ":" + String((minute + selectedPackage.minutes) % 60).padStart(2,"0"), package: packageType, players, durationMinutes: selectedPackage.minutes, cleanupMinutes });
    }
  }
  return { status: "verified_against_public_blocks", message: slots.length ? "Horarios candidatos calculados con los bloqueos públicos y el margen de limpieza. Confirma la reserva en el sistema oficial antes de prometer el cupo." : "No se encontraron horarios candidatos en el rango consultado.", slots, package: packageType, players, range: { from, to }, assumptions: ["Horario base 08:00–23:00 del documento funcional; confirmar cierres especiales.", "Se aplican 30 minutos de limpieza después de cada partida.", "La API pública no crea ni confirma reservas; el cupo puede cambiar antes de reservar."] };
}
