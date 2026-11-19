import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export function createStore(directory) {
  const file = path.join(directory, "state.json");
  let queue = Promise.resolve();
  async function read() {
    try { return { messages: [], escalations: [], audit: [], ownerMemories: [], webChangeRequests: [], websiteChecks: [], reservationRequests: [], ...JSON.parse(await fs.readFile(file, "utf8")) }; }
    catch (error) { if (error.code === "ENOENT") return { messages: [], escalations: [], audit: [], ownerMemories: [], webChangeRequests: [], websiteChecks: [], reservationRequests: [] }; throw error; }
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
      const item = { id: randomUUID(), category: input.category || "guia_de_atencion", text, sourceMessage: input.sourceMessage || "", active: true, revisions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      state.ownerMemories.push(item); return item;
    }),
    updateOwnerMemory: (id, input) => mutate(state => {
      const item = state.ownerMemories.find(entry => entry.id === id && entry.active);
      const text = String(input.text || "").trim();
      if (!item || !text) return null;
      if (item.text.toLowerCase() === text.toLowerCase()) return { ...item, duplicate: true };
      item.revisions = [...(item.revisions || []), { text: item.text, category: item.category, replacedAt: new Date().toISOString(), sourceMessage: item.sourceMessage || "" }];
      item.text = text; item.category = input.category || item.category; item.sourceMessage = input.sourceMessage || item.sourceMessage; item.updatedAt = new Date().toISOString();
      return item;
    }),
    async listOwnerMemories({ activeOnly = true } = {}) { return (await read()).ownerMemories.filter(item => !activeOnly || item.active); },
    deactivateOwnerMemory: id => mutate(state => {
      const item = state.ownerMemories.find(entry => entry.id === id && entry.active);
      if (!item) return null;
      item.active = false; item.updatedAt = new Date().toISOString(); return item;
    }),
    createReservationRequest: input => mutate(state => {
      const item = { id: randomUUID(), status: "pending_owner_review", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input };
      state.reservationRequests ||= []; state.reservationRequests.push(item); return item;
    }),
    async listReservationRequests({ activeOnly = true } = {}) {
      const items = (await read()).reservationRequests || [];
      return items.filter(item => !activeOnly || ["pending_owner_review", "owner_contacted"].includes(item.status));
    },
    updateReservationRequest: (id, status, details = {}) => mutate(state => {
      const item = (state.reservationRequests || []).find(entry => entry.id === id && ["pending_owner_review", "owner_contacted"].includes(entry.status));
      if (!item || !["owner_contacted", "closed"].includes(status)) return null;
      Object.assign(item, details, { status, updatedAt: new Date().toISOString() }); return item;
    }),
    createWebChangeRequest: input => mutate(state => {
      const item = { id: randomUUID(), status: "pending_review", createdAt: new Date().toISOString(), requestedBy: "owner", ...input };
      state.webChangeRequests.push(item); return item;
    }),
    async listWebChangeRequests({ activeOnly = true } = {}) {
      const items = (await read()).webChangeRequests;
      return items.filter(item => !activeOnly || ["pending_review", "approved_pending_integration"].includes(item.status));
    },
    approveWebChangeRequest: (id, approvedBy) => mutate(state => {
      const item = state.webChangeRequests.find(entry => entry.id === id && entry.status === "pending_review");
      if (!item) return null;
      item.status = "approved_pending_integration"; item.approvedBy = approvedBy; item.approvedAt = new Date().toISOString();
      return item;
    }),
    saveWebsiteCheck: result => mutate(state => {
      state.websiteChecks.push(result);
      state.websiteChecks = state.websiteChecks.slice(-500);
      return result;
    }),
    async getLatestWebsiteCheck() {
      const items = (await read()).websiteChecks;
      return items.at(-1) || null;
    },
    async listWebsiteChecks(limit = 20) { return (await read()).websiteChecks.slice(-Math.max(1, Math.min(100, limit))); },
    async listAudit(limit = 100) { return (await read()).audit.slice(-Math.max(1, Math.min(1000, limit))); },
    async getOperationalMetrics(start, end) {
      const state = await read();
      const inRange = value => value && new Date(value) >= start && new Date(value) < end;
      const audits = state.audit.filter(item => inRange(item.at));
      const escalations = state.escalations.filter(item => inRange(item.createdAt));
      const checks = state.websiteChecks.filter(item => inRange(item.checkedAt));
      const changes = state.webChangeRequests;
      return {
        inboundMessages: state.messages.filter(item => inRange(item.storedAt)).length,
        outboundMessages: audits.filter(item => item.type === "outgoing_message").length,
        escalationsOpened: escalations.length,
        escalationsAnswered: audits.filter(item => item.type === "owner_escalation_answered").length,
        escalationsTimedOut: audits.filter(item => item.type === "owner_escalation_timeout").length,
        escalationsPending: state.escalations.filter(item => item.status === "pending").length,
        websiteChecks: checks.length,
        websiteFailures: checks.filter(item => !item.ok).length,
        webChangesPending: changes.filter(item => item.status === "pending_review").length,
        webChangesApprovedPending: changes.filter(item => item.status === "approved_pending_integration").length
      };
    },
    audit: event => mutate(state => {
      state.audit.push({ ...event, at: new Date().toISOString() }); state.audit = state.audit.slice(-10000);
    })
  };
}
