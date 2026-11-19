-- Black Ops PostgreSQL schema. Safe to execute repeatedly.
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
