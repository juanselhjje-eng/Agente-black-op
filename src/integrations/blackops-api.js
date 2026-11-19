const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function createBlackOpsPublicApi(config, fetchImpl = fetch) {
  const enabled = Boolean(config.blackopsApiEnabled && config.blackopsApiBaseUrl);
  async function request(path) {
    if (!enabled) throw new Error("La API pública de Black Ops no está habilitada.");
    const base = config.blackopsApiBaseUrl.replace(/\/$/, "");
    const response = await fetchImpl(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "GET", path }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`API Black Ops respondió HTTP ${response.status}`);
    return response.json();
  }
  return {
    isEnabled: () => enabled,
    getPublicConfig: () => request("/api/public/config"),
    getAvailability(from, to) {
      if (!DATE.test(from) || !DATE.test(to) || from > to) {
        throw new TypeError("Las fechas deben tener formato YYYY-MM-DD y el inicio no puede superar el fin.");
      }
      return request(`/api/public/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    }
  };
}
