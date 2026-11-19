import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function createStore(directory) {
  const file = path.join(directory, "state.json");
  let queue = Promise.resolve();
  async function read() {
    try { return JSON.parse(await fs.readFile(file, "utf8")); }
    catch (error) {
      if (error.code === "ENOENT") return { messages: [], escalations: [], audit: [] };
      throw error;
    }
  }
  async function write(state) {
    await fs.mkdir(directory, { recursive: true });
    const temp = file + ".tmp";
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    await fs.rename(temp, file);
  }
  function mutate(fn) {
    const operation = queue.then(async () => {
      const state = await read();
      const result = await fn(state);
      await write(state);
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  return {
    async addMessage(message) {
      return mutate(state => {
        if (state.messages.some(item => item.id === message.id)) return false;
        state.messages.push({ ...message, storedAt: new Date().toISOString() });
        state.messages = state.messages.slice(-5000);
        return true;
      });
    },
    async createEscalation(input) {
      return mutate(state => {
        const item = { id: randomUUID(), status: "pending", createdAt: new Date().toISOString(), dueAt: new Date(Date.now() + 120000).toISOString(), ...input };
        state.escalations.push(item);
        return item;
      });
    },
    async listDueEscalations(now = new Date()) {
      const state = await read();
      return state.escalations.filter(item => item.status === "pending" && new Date(item.dueAt) <= now);
    },
    async closeEscalation(id, status, details = {}) {
      return mutate(state => {
        const item = state.escalations.find(entry => entry.id === id);
        if (!item || item.status !== "pending") return null;
        Object.assign(item, details, { status, closedAt: new Date().toISOString() });
        return item;
      });
    },
    async listPendingEscalations() {
      const state = await read();
      return state.escalations.filter(item => item.status === "pending");
    },
    async audit(event) {
      return mutate(state => {
        state.audit.push({ ...event, at: new Date().toISOString() });
        state.audit = state.audit.slice(-10000);
      });
    }
  };
}
