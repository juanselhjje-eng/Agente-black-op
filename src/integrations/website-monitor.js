const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function createWebsiteMonitor({ url, timeoutMs = 8000, fetchImpl = fetch }) {
  let target;
  if (url) {
    target = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(target.protocol)) throw new TypeError("La URL de monitoreo debe usar HTTP o HTTPS.");
  }
  return {
    isConfigured: () => Boolean(target),
    async check() {
      if (!target) return { configured: false, ok: false, reason: "not_configured", checkedAt: new Date().toISOString() };
      const started = Date.now();
      try {
        const response = await fetchImpl(target, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(timeoutMs),
          headers: { "User-Agent": "BlackOps-Monitor/1.0" }
        });
        const status = response.status;
        const ok = status >= 200 && status < 400;
        return { configured: true, ok, status, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), reason: ok ? "reachable" : "http_error" };
      } catch (error) {
        return { configured: true, ok: false, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), reason: error.name === "TimeoutError" ? "timeout" : "network_error", error: String(error.message || error).slice(0, 240) };
      }
    }
  };
}
