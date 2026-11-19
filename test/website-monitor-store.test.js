import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createStore } from "../src/storage/json-store.js";

test("persiste historial de verificaciones de página y conserva la última", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "blackops-webchecks-"));
  try {
    const store = createStore(directory);
    const first = { ok: true, status: 200, checkedAt: "2026-11-19T12:00:00.000Z" };
    const second = { ok: false, status: 503, checkedAt: "2026-11-19T12:05:00.000Z" };
    await store.saveWebsiteCheck(first);
    await store.saveWebsiteCheck(second);
    assert.deepEqual(await store.getLatestWebsiteCheck(), second);
    assert.equal((await store.listWebsiteChecks()).length, 2);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
