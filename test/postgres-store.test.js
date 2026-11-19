import test from "node:test";
import assert from "node:assert/strict";
import { createPostgresStore } from "../src/storage/postgres-store.js";

test("PostgreSQL exige URL o pool", () => {
  assert.throws(() => createPostgresStore({}), /DATABASE_URL/);
});

test("inicializa el esquema una sola vez y registra mensajes idempotentes", async () => {
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith("INSERT INTO blackops_messages")) return { rowCount: 1, rows: [{ id: values[0] }] };
      return { rowCount: 0, rows: [] };
    },
    async end() {}
  };
  const store = createPostgresStore({ pool });
  await Promise.all([store.init(), store.init(), store.init()]);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /blackops_owner_memories/);
  assert.equal(await store.addMessage({ id: "wamid-1", from: "573001112233", text: "Hola" }), true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].values, ["wamid-1", "573001112233", "Hola"]);
  await store.close();
});
