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
    // El almacenamiento asigna las marcas de tiempo al momento de escribir.
    // Construimos una ventana alrededor del instante de ejecución para que
    // la prueba no dependa de una fecha fija ni falle al cambiar el día.
    const now = new Date();
    const start = new Date(now.getTime() - 60_000);
    const end = new Date(now.getTime() + 60_000);

    await store.addMessage({ id: "in-1", from: "573001", text: "Hola" });
    await store.audit({ type: "outgoing_message", messageId: "in-1" });
    await store.audit({ type: "owner_escalation_answered", escalationId: "e-1" });
    await store.saveWebsiteCheck({ ok: true, checkedAt: now.toISOString() });
    await store.saveWebsiteCheck({ ok: false, checkedAt: now.toISOString() });
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
