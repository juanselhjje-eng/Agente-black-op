import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export function createStore(directory) {
  const file = path.join(directory, "state.json");
  let queue = Promise.resolve();
  async function read() {
    try { return { messages: [], escalations: [], audit: [], ownerMemories: [], ...JSON.parse(await fs.readFile(file, "utf8")) }; }
    catch (error) { if (error.code === "ENOENT") return { messages: [], escalations: [], audit: [], ownerMemories: [] }; throw error; }
  }
  async function write(state) {
    await fs.mkdir(directory, { recursive: true });
    const temp = file + ".tmp";
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    await fs.rename(temp, file);
  }
  function mutate(fn) {
    const operation = queue.then(async () => { const state = await read(); const result = await fn(state); await write(state); return result; });
    queue = operation.catch(() => {});
    return operation;
  }
  return {
    addMessage: message => mutate(state => {
      if (state.messages.some(item => item.id === message.id)) return false;
      state.messages.push({ ...message, storedAt: new Date().toISOString() });
      state.messages = state.messages.slice(-5000);
      return true;
    }),
    createEscalation: input => mutate(state => {
      const item = { id: randomUUID(), status: "pending", createdAt: new Date().toISOString(), dueAt: new Date(Date.now() + 120000).toISOString(), ...input };
      state.escalations.push(item); return item;
    }),
    async listDueEscalations(now = new Date()) {
      return (await read()).escalations.filter(item => item.status === "pending" && new Date(item.dueAt) <= now);
    },
    closeEscalation: (id, status, details = {}) => mutate(state => {
      const item = state.escalations.find(entry => entry.id === id);
      if (!item || item.status !== "pending") return null;
      Object.assign(item, details, { status, closedAt: new Date().toISOString() }); return item;
    }),
    async listPendingEscalations() { return (await read()).escalations.filter(item => item.status === "pending"); },
    saveOwnerMemory: input => mutate(state => {
      const text = String(input.text || "").trim();
      if (!text) throw new TypeError("La memoria no puede estar vacía.");
      const duplicate = state.ownerMemories.find(item => item.active && item.text.toLowerCase() === text.toLowerCase());
      if (duplicate) return { ...duplicate, duplicate: true };
      const item = { id: randomUUID(), category: input.category || "guia_de_atencion", text, sourceMessage: input.sourceMessage || "", active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      state.ownerMemories.push(item); return item;
    }),
    async listOwnerMemories({ activeOnly = true } = {}) {
      return (await read()).ownerMemories.filter(item => !activeOnly || item.active);
    },
    deactivateOwnerMemory: id => mutate(state => {
      const item = state.ownerMemories.find(entry => entry.id === id && entry.active);
      if (!item) return null;
      item.active = false; item.updatedAt = new Date().toISOString(); return item;
    }),
    audit: event => mutate(state => {
      state.audit.push({ ...event, at: new Date().toISOString() }); state.audit = state.audit.slice(-10000);
    })
  };
}
