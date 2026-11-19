import test from "node:test";
import assert from "node:assert/strict";
import { createWebsiteMonitor } from "../src/integrations/website-monitor.js";

test("no intenta consultar cuando la URL no está configurada", async () => {
  const monitor = createWebsiteMonitor({ url: "" });
  assert.equal(monitor.isConfigured(), false);
  assert.equal((await monitor.check()).reason, "not_configured");
});

test("acepta respuestas HTTP exitosas y registra latencia", async () => {
  const monitor = createWebsiteMonitor({
    url: "https://blackops.example",
    fetchImpl: async () => ({ status: 200 })
  });
  const result = await monitor.check();
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(typeof result.latencyMs, "number");
});

test("marca errores HTTP como caída", async () => {
  const monitor = createWebsiteMonitor({
    url: "https://blackops.example",
    fetchImpl: async () => ({ status: 503 })
  });
  const result = await monitor.check();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "http_error");
});

test("rechaza protocolos no web", () => {
  assert.throws(() => createWebsiteMonitor({ url: "file:///etc/passwd" }), /HTTP o HTTPS/);
});
