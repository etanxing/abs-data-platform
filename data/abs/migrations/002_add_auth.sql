-- Users table (email+password auth)
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email              TEXT    UNIQUE NOT NULL,
  password_hash      TEXT    NOT NULL,
  salt               TEXT    NOT NULL,
  name               TEXT,
  product            TEXT    NOT NULL DEFAULT 'grantdata',
  stripe_customer_id TEXT,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Subscription table (Stripe recurring billing)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id                 TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT    UNIQUE,
  plan                    TEXT    NOT NULL DEFAULT 'starter',  -- starter | professional | team
  status                  TEXT    NOT NULL DEFAULT 'active',   -- active | past_due | canceled | trialing
  current_period_end      INTEGER,
  lookup_count            INTEGER NOT NULL DEFAULT 0,
  lookup_reset_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at              INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at              INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id  ON subscriptions(stripe_subscription_id);

-- Saved regions per user
CREATE TABLE IF NOT EXISTS saved_regions (
  id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sa2_code   TEXT    NOT NULL,
  suburb     TEXT    NOT NULL,
  postcode   TEXT,
  state      TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_saved_regions_user   ON saved_regions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_regions_uniq ON saved_regions(user_id, sa2_code);
