CREATE TABLE IF NOT EXISTS contract_templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
