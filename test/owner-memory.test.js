import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createStore } from "../src/storage/json-store.js";

async function withStore(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "blackops-memory-"));
  try { await run(createStore(directory)); }
  finally { await fs.rm(directory, { recursive: true, force: true }); }
}

test("guarda, lista y desactiva las instrucciones del dueño", async () => withStore(async store => {
  const saved = await store.saveOwnerMemory({ text: "Explicar primero el paquete Táctico.", category: "preferencia_comercial" });
  assert.equal(saved.active, true);
  assert.equal((await store.listOwnerMemories()).length, 1);
  const duplicate = await store.saveOwnerMemory({ text: "Explicar primero el paquete Táctico." });
  assert.equal(duplicate.duplicate, true);
  const deactivated = await store.deactivateOwnerMemory(saved.id);
  assert.equal(deactivated.active, false);
  assert.equal((await store.listOwnerMemories()).length, 0);
}));

test("actualiza una guía conservando la versión anterior", async () => withStore(async store => {
  const saved = await store.saveOwnerMemory({ text: "Ofrecer primero el paquete Estándar." });
  const updated = await store.updateOwnerMemory(saved.id, { text: "Explicar primero el paquete Táctico." });
  assert.equal(updated.text, "Explicar primero el paquete Táctico.");
  assert.equal(updated.revisions.length, 1);
  assert.equal(updated.revisions[0].text, "Ofrecer primero el paquete Estándar.");
}));

test("registra, consulta y aprueba cambios web sin marcarlos como publicados", async () => withStore(async store => {
  const request = await store.createWebChangeRequest({ summary: "Cambiar texto del botón principal", desiredState: "Debe decir Reservar ahora" });
  assert.equal(request.status, "pending_review");
  assert.equal((await store.listWebChangeRequests()).length, 1);
  const approved = await store.approveWebChangeRequest(request.id, "owner-whatsapp");
  assert.equal(approved.status, "approved_pending_integration");
  assert.equal((await store.listWebChangeRequests()).length, 1);
}));
