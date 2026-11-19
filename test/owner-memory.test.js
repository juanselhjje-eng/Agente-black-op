import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createStore } from "../src/storage/json-store.js";

test("guarda, lista y desactiva las instrucciones del dueño", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "blackops-memory-"));
  try {
    const store = createStore(directory);
    const saved = await store.saveOwnerMemory({ text: "Explicar primero el paquete Táctico.", category: "preferencia_comercial" });
    assert.equal(saved.active, true);
    assert.equal((await store.listOwnerMemories()).length, 1);
    const duplicate = await store.saveOwnerMemory({ text: "Explicar primero el paquete Táctico." });
    assert.equal(duplicate.duplicate, true);
    const deactivated = await store.deactivateOwnerMemory(saved.id);
    assert.equal(deactivated.active, false);
    assert.equal((await store.listOwnerMemories()).length, 0);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
