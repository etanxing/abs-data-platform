-- Migration 001: Add reports table for Stripe payment tracking
-- Apply with: wrangler d1 execute abs-data --file=data/abs/migrations/001_add_reports.sql

CREATE TABLE IF NOT EXISTS reports (
    id                     TEXT PRIMARY KEY,   -- crypto.randomUUID()
    suburb                 TEXT NOT NULL,
    sa2_code               TEXT,
    stripe_session_id      TEXT UNIQUE,
    stripe_payment_intent  TEXT,
    status                 TEXT NOT NULL DEFAULT 'pending',
    -- Status values: pending | generating | ready | error
    r2_key                 TEXT,               -- R2 object key once generated
    error_message          TEXT,
    created_at             INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at             INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_reports_status     ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_suburb     ON reports (suburb COLLATE NOCASE);
