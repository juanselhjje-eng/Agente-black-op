const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 30;
const DEFAULT_TIMEOUT_MS = 8000;

function parseDay(value) {
  if (typeof value !== "string" || !DAY.test(value)) return null;
  const time = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time : null;
}

function validateBaseUrl(value) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { throw new TypeError("La URL base de la API pública no es válida."); }
  if (url.protocol !== "https:" && !["localhost","127.0.0.1"].includes(url.hostname)) {
    throw new TypeError("La API pública debe usar HTTPS.");
  }
  return url.toString().replace(/\/$/, "");
}

function validatePayload(payload, label) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("La API pública devolvió una respuesta inválida para " + label + ".");
  }
  return payload;
}

export function createBlackOpsPublicApi(config, fetchImpl = fetch, options = {}) {
  const baseUrl = validateBaseUrl(config.blackopsApiBaseUrl || "");
  const enabled = Boolean(config.blackopsApiEnabled && baseUrl);
  const timeoutMs = Number.isInteger(options.timeoutMs) && options.timeoutMs >= 100 ? Math.min(options.timeoutMs,30000) : DEFAULT_TIMEOUT_MS;

  async function request(path, label) {
    if (!enabled) throw new Error("La API pública de Black Ops no está habilitada.");
    let response;
    try {
      response = await fetchImpl(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ method: "GET", path }),
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        throw new Error("La API pública de Black Ops excedió el tiempo de espera.");
      }
      throw new Error("No fue posible conectar con la API pública de Black Ops.");
    }
    if (!response?.ok) throw new Error("API Black Ops respondió HTTP " + (Number(response?.status) || "desconocido"));
    let payload;
    try { payload = await response.json(); }
    catch { throw new TypeError("La API pública de Black Ops no devolvió JSON válido."); }
    return validatePayload(payload, label);
  }

  function getAvailability(from, to) {
    const start = parseDay(from), end = parseDay(to);
    if (start === null || end === null || start > end) {
      throw new TypeError("Las fechas deben ser fechas reales YYYY-MM-DD y el inicio no puede superar el fin.");
    }
    if ((end - start) / 86400000 > MAX_RANGE_DAYS) {
      throw new RangeError("La consulta pública admite máximo 31 días por solicitud.");
    }
    return request("/api/public/availability?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to), "disponibilidad");
  }

  return {
    isEnabled: () => enabled,
    getPublicConfig: () => request("/api/public/config", "configuración"),
    getAvailability
  };
}
