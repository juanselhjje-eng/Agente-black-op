import test from "node:test";
import assert from "node:assert/strict";
import { createBlackOpsPublicApi } from "../src/integrations/blackops-api.js";

test("API pública permanece apagada por defecto", async () => {
  const api = createBlackOpsPublicApi({ blackopsApiEnabled: false, blackopsApiBaseUrl: "" });
  assert.equal(api.isEnabled(), false);
  await assert.rejects(() => api.getPublicConfig(), /no está habilitada/);
});

test("consulta configuración con el contrato POST documentado", async () => {
  let request;
  const api = createBlackOpsPublicApi({
    blackopsApiEnabled: true,
    blackopsApiBaseUrl: "https://example.test/functions/v1/api"
  }, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ settings: { price_standard: 35000 } }) };
  });
  const result = await api.getPublicConfig();
  assert.equal(result.settings.price_standard, 35000);
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { method: "GET", path: "/api/public/config" });
});

test("valida formato y orden de fechas de disponibilidad", async () => {
  const api = createBlackOpsPublicApi({
    blackopsApiEnabled: true,
    blackopsApiBaseUrl: "https://example.test/api"
  }, async () => ({ ok: true, json: async () => ({ busy: [] }) }));
  await assert.rejects(() => api.getAvailability("20-11-2026", "2026-11-21"), /YYYY-MM-DD/);
  await assert.rejects(() => api.getAvailability("2026-11-22", "2026-11-21"), /YYYY-MM-DD/);
});
