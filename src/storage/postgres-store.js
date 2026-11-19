import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

export function createPostgresStore({ connectionString, pool, max = 10 }) {
  if (!pool && !connectionString) throw new TypeError("DATABASE_URL es obligatorio para PostgreSQL.");
  const db = pool || new Pool({ connectionString, max, ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: true } : undefined });
  let initPromise;
  const schema = `
    CREATE TABLE IF NOT EXISTS blackops_messages (
      id TEXT PRIMARY KEY, sender TEXT NOT NULL, body TEXT NOT NULL, stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS blackops_messages_stored_at_idx ON blackops_messages(stored_at DESC);
    CREATE TABLE IF NOT EXISTS blackops_escalations (
      id UUID PRIMARY KEY, customer TEXT NOT NULL, question TEXT NOT NULL, status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL, due_at TIMESTAMPTZ NOT NULL, closed_at TIMESTAMPTZ, data JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE INDEX IF NOT EXISTS blackops_escalations_due_idx ON blackops_escalations(status, due_at);
    CREATE TABLE IF NOT EXISTS blackops_owner_memories (
      id UUID PRIMARY KEY, category TEXT NOT NULL, body TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
      revisions JSONB NOT NULL DEFAULT '[]'::jsonb, source_message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS blackops_memories_active_idx ON blackops_owner_memories(active, updated_at DESC);
    CREATE TABLE IF NOT EXISTS blackops_reservation_requests (
      id UUID PRIMARY KEY, status TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS blackops_reservation_requests_status_idx ON blackops_reservation_requests(status, created_at DESC);
    CREATE TABLE IF NOT EXISTS blackops_web_changes (
      id UUID PRIMARY KEY, status TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL,
      approved_at TIMESTAMPTZ, approved_by TEXT
    );
    CREATE INDEX IF NOT EXISTS blackops_web_changes_status_idx ON blackops_web_changes(status, created_at DESC);
    CREATE TABLE IF NOT EXISTS blackops_website_checks (
      id BIGSERIAL PRIMARY KEY, ok BOOLEAN NOT NULL, checked_at TIMESTAMPTZ NOT NULL, data JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS blackops_website_checks_at_idx ON blackops_website_checks(checked_at DESC);
    CREATE TABLE IF NOT EXISTS blackops_audit (
      id BIGSERIAL PRIMARY KEY, event JSONB NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS blackops_audit_at_idx ON blackops_audit(at DESC);
  `;
  async function init() {
    if (!initPromise) initPromise = db.query(schema).catch(error => { initPromise = null; throw error; });
    await initPromise;
  }
  const query = async (sql, values = []) => { await init(); return db.query(sql, values); };
  return {
    init,
    async close() { await db.end?.(); },
    async addMessage(message) {
      const result = await query("INSERT INTO blackops_messages(id,sender,body) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING RETURNING id", [message.id, message.from, message.text]);
      return result.rowCount === 1;
    },
    async createEscalation(input) {
      const item = { id: randomUUID(), status: "pending", createdAt: new Date().toISOString(), dueAt: new Date(Date.now() + 120000).toISOString(), ...input };
      await query("INSERT INTO blackops_escalations(id,customer,question,status,created_at,due_at,data) VALUES($1,$2,$3,$4,$5,$6,$7)", [item.id,item.customer,item.question,item.status,item.createdAt,item.dueAt,item]);
      return item;
    },
    async listDueEscalations(now = new Date()) {
      const r = await query("SELECT data FROM blackops_escalations WHERE status='pending' AND due_at <= $1 ORDER BY due_at", [now]);
      return r.rows.map(row => row.data);
    },
    async closeEscalation(id, status, details = {}) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const found = await client.query("SELECT data FROM blackops_escalations WHERE id=$1 AND status='pending' FOR UPDATE", [id]);
        if (!found.rowCount) { await client.query("ROLLBACK"); return null; }
        const item = { ...found.rows[0].data, ...details, status, closedAt: new Date().toISOString() };
        await client.query("UPDATE blackops_escalations SET status=$2,closed_at=$3,data=$4 WHERE id=$1", [id,status,item.closedAt,item]);
        await client.query("COMMIT");
        return item;
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    },
    async listPendingEscalations() {
      const r = await query("SELECT data FROM blackops_escalations WHERE status='pending' ORDER BY created_at");
      return r.rows.map(row => row.data);
    },
    async saveOwnerMemory(input) {
      const body = String(input.text || "").trim();
      if (!body) throw new TypeError("La memoria no puede estar vacía.");
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const duplicate = await client.query("SELECT * FROM blackops_owner_memories WHERE active=TRUE AND lower(body)=lower($1) LIMIT 1 FOR UPDATE", [body]);
        if (duplicate.rowCount) { await client.query("COMMIT"); return memoryRow(duplicate.rows[0], true); }
        const now = new Date();
        const item = { id: randomUUID(), category: input.category || "guia_de_atencion", text: body, sourceMessage: input.sourceMessage || "", active: true, revisions: [], createdAt: now.toISOString(), updatedAt: now.toISOString() };
        await client.query("INSERT INTO blackops_owner_memories(id,category,body,active,revisions,source_message,created_at,updated_at) VALUES($1,$2,$3,TRUE,'[]'::jsonb,$4,$5,$5)", [item.id,item.category,item.text,item.sourceMessage,now]);
        await client.query("COMMIT");
        return item;
      } catch(error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    },
    async updateOwnerMemory(id, input) {
      const body = String(input.text || "").trim();
      if (!body) return null;
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const r = await client.query("SELECT * FROM blackops_owner_memories WHERE id=$1 AND active=TRUE FOR UPDATE", [id]);
        if (!r.rowCount) { await client.query("ROLLBACK"); return null; }
        const row = r.rows[0];
        if (row.body.toLowerCase() === body.toLowerCase()) { await client.query("COMMIT"); return memoryRow(row, true); }
        const revisions = [...(row.revisions || []), { text: row.body, category: row.category, replacedAt: new Date().toISOString(), sourceMessage: row.source_message }];
        const updated = await client.query("UPDATE blackops_owner_memories SET body=$2,category=$3,revisions=$4,source_message=$5,updated_at=NOW() WHERE id=$1 RETURNING *", [id,body,input.category || row.category,revisions,input.sourceMessage || row.source_message]);
        await client.query("COMMIT");
        return memoryRow(updated.rows[0]);
      } catch(error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    },
    async listOwnerMemories({ activeOnly = true } = {}) {
      const r = await query("SELECT * FROM blackops_owner_memories " + (activeOnly ? "WHERE active=TRUE " : "") + "ORDER BY created_at");
      return r.rows.map(row => memoryRow(row));
    },
    async deactivateOwnerMemory(id) {
      const r = await query("UPDATE blackops_owner_memories SET active=FALSE,updated_at=NOW() WHERE id=$1 AND active=TRUE RETURNING *", [id]);
      return r.rowCount ? memoryRow(r.rows[0]) : null;
    },
    async createReservationRequest(input) {
      const now = new Date().toISOString();
      const item = { id: randomUUID(), status: "pending_owner_review", createdAt: now, updatedAt: now, ...input };
      await query("INSERT INTO blackops_reservation_requests(id,status,data,created_at,updated_at) VALUES($1,$2,$3,$4,$5)", [item.id,item.status,item,now,now]);
      return item;
    },
    async listReservationRequests({ activeOnly = true } = {}) {
      const sql = activeOnly
        ? "SELECT data FROM blackops_reservation_requests WHERE status IN ('pending_owner_review','owner_contacted') ORDER BY created_at DESC LIMIT 200"
        : "SELECT data FROM blackops_reservation_requests ORDER BY created_at DESC LIMIT 200";
      const r = await query(sql); return r.rows.map(row => row.data);
    },
    async updateReservationRequest(id, status, details = {}) {
      if (!["owner_contacted", "rejected", "cancelled_by_customer", "closed"].includes(status)) return null;
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const found = await client.query("SELECT data FROM blackops_reservation_requests WHERE id=$1 AND status IN ('pending_owner_review','owner_contacted') FOR UPDATE", [id]);
        if (!found.rowCount) { await client.query("ROLLBACK"); return null; }
        const item = { ...found.rows[0].data, ...details, status, updatedAt: new Date().toISOString() };
        await client.query("UPDATE blackops_reservation_requests SET status=$2,data=$3,updated_at=$4 WHERE id=$1", [id,status,item,item.updatedAt]);
        await client.query("COMMIT"); return item;
      } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    },
    async createWebChangeRequest(input) {
      const item = { id: randomUUID(), status: "pending_review", createdAt: new Date().toISOString(), requestedBy: "owner", ...input };
      await query("INSERT INTO blackops_web_changes(id,status,data,created_at) VALUES($1,$2,$3,$4)", [item.id,item.status,item,item.createdAt]);
      return item;
    },
    async listWebChangeRequests({ activeOnly = true } = {}) {
      const r = await query("SELECT data FROM blackops_web_changes " + (activeOnly ? "WHERE status IN ('pending_review','approved_pending_integration') " : "") + "ORDER BY created_at");
      return r.rows.map(row => row.data);
    },
    async approveWebChangeRequest(id, approvedBy) {
      const r = await query("UPDATE blackops_web_changes SET status='approved_pending_integration',approved_by=$2,approved_at=NOW(),data=data || jsonb_build_object('status','approved_pending_integration','approvedBy',$2,'approvedAt',NOW()::text) WHERE id=$1 AND status='pending_review' RETURNING data", [id,approvedBy]);
      return r.rowCount ? r.rows[0].data : null;
    },
    async saveWebsiteCheck(result) {
      await query("INSERT INTO blackops_website_checks(ok,checked_at,data) VALUES($1,$2,$3)", [Boolean(result.ok),result.checkedAt || new Date(),result]);
      return result;
    },
    async getLatestWebsiteCheck() {
      const r = await query("SELECT data FROM blackops_website_checks ORDER BY checked_at DESC,id DESC LIMIT 1");
      return r.rows[0]?.data || null;
    },
    async listWebsiteChecks(limit = 20) {
      const r = await query("SELECT data FROM blackops_website_checks ORDER BY checked_at DESC,id DESC LIMIT $1", [Math.max(1,Math.min(100,limit))]);
      return r.rows.map(row => row.data).reverse();
    },
    async getOperationalMetrics(start, end) {
      const r = await query(`
        SELECT
          (SELECT COUNT(*)::int FROM blackops_messages WHERE stored_at >= $1 AND stored_at < $2) AS inbound_messages,
          (SELECT COUNT(*)::int FROM blackops_audit WHERE at >= $1 AND at < $2 AND event->>'type'='outgoing_message') AS outbound_messages,
          (SELECT COUNT(*)::int FROM blackops_escalations WHERE created_at >= $1 AND created_at < $2) AS escalations_opened,
          (SELECT COUNT(*)::int FROM blackops_audit WHERE at >= $1 AND at < $2 AND event->>'type'='owner_escalation_answered') AS escalations_answered,
          (SELECT COUNT(*)::int FROM blackops_audit WHERE at >= $1 AND at < $2 AND event->>'type'='owner_escalation_timeout') AS escalations_timed_out,
          (SELECT COUNT(*)::int FROM blackops_escalations WHERE status='pending') AS escalations_pending,
          (SELECT COUNT(*)::int FROM blackops_website_checks WHERE checked_at >= $1 AND checked_at < $2) AS website_checks,
          (SELECT COUNT(*)::int FROM blackops_website_checks WHERE checked_at >= $1 AND checked_at < $2 AND ok=FALSE) AS website_failures,
          (SELECT COUNT(*)::int FROM blackops_web_changes WHERE status='pending_review') AS web_changes_pending,
          (SELECT COUNT(*)::int FROM blackops_web_changes WHERE status='approved_pending_integration') AS web_changes_approved_pending
      `, [start, end]);
      const row = r.rows[0];
      return {
        inboundMessages: row.inbound_messages, outboundMessages: row.outbound_messages,
        escalationsOpened: row.escalations_opened, escalationsAnswered: row.escalations_answered,
        escalationsTimedOut: row.escalations_timed_out, escalationsPending: row.escalations_pending,
        websiteChecks: row.website_checks, websiteFailures: row.website_failures,
        webChangesPending: row.web_changes_pending, webChangesApprovedPending: row.web_changes_approved_pending
      };
    },
    async audit(event) { await query("INSERT INTO blackops_audit(event) VALUES($1)", [event]); },
    async listAudit(limit = 100) {
      const r = await query("SELECT event,at FROM blackops_audit ORDER BY id DESC LIMIT $1", [Math.max(1,Math.min(1000,limit))]);
      return r.rows.map(row => ({ ...row.event, at: row.at }));
    }
  };
}

function memoryRow(row, duplicate = false) {
  return { id: row.id, category: row.category, text: row.body, sourceMessage: row.source_message, active: row.active, revisions: row.revisions || [], createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(), ...(duplicate ? { duplicate: true } : {}) };
}
