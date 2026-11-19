import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createStore } from "../src/storage/json-store.js";

test("el almacenamiento JSON agrega métricas operativas dentro del periodo", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "blackops-report-"));
  try {
    const store = createStore(directory);
    const start = new Date("2026-11-19T05:00:00.000Z");
    const end = new Date("2026-11-20T05:00:00.000Z");
    await store.addMessage({ id: "in-1", from: "573001", text: "Hola" });
    await store.audit({ type: "outgoing_message", messageId: "in-1" });
    await store.audit({ type: "owner_escalation_answered", escalationId: "e-1" });
    await store.saveWebsiteCheck({ ok: true, checkedAt: "2026-11-19T15:00:00.000Z" });
    await store.saveWebsiteCheck({ ok: false, checkedAt: "2026-11-19T16:00:00.000Z" });
    await store.createWebChangeRequest({ summary: "Actualizar portada" });
    const metrics = await store.getOperationalMetrics(start, end);
    assert.equal(metrics.inboundMessages, 1);
    assert.equal(metrics.outboundMessages, 1);
    assert.equal(metrics.escalationsAnswered, 1);
    assert.equal(metrics.websiteChecks, 2);
    assert.equal(metrics.websiteFailures, 1);
    assert.equal(metrics.webChangesPending, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
