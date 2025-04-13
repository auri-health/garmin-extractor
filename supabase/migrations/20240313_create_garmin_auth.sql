CREATE TABLE IF NOT EXISTS garmin_auth (
  user_id TEXT PRIMARY KEY,
  garmin_email TEXT NOT NULL,
  garmin_password TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
); 