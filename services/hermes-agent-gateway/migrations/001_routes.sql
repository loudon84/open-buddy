-- Route rows owned by the agent gateway.
-- The process store writes the same columns as JSON because Vitest cannot load node:sqlite.
-- It is not a Hermes process.

CREATE TABLE IF NOT EXISTS agent_instances (
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  agent_instance_id TEXT NOT NULL,
  upstream_url TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  PRIMARY KEY (tenant_id, agent_instance_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  agent_instance_id TEXT NOT NULL,
  upstream_url TEXT NOT NULL,
  status TEXT NOT NULL
);
