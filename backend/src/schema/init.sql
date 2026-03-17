CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(32),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name VARCHAR(120);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32);

ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx
  ON users(phone)
  WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(32) NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type VARCHAR(16) NOT NULL CHECK (job_type IN ('single', 'bulk')),
  status VARCHAR(16) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  source_file_name TEXT,
  source_file_path TEXT,
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  qr_content TEXT,
  bulk_qr_type VARCHAR(32) NOT NULL DEFAULT 'URL',
  qr_size INTEGER NOT NULL DEFAULT 512,
  foreground_color VARCHAR(32) NOT NULL DEFAULT '#000000',
  background_color VARCHAR(32) NOT NULL DEFAULT '#ffffff',
  qr_margin INTEGER NOT NULL DEFAULT 2,
  output_format VARCHAR(8) NOT NULL DEFAULT 'png',
  error_correction_level VARCHAR(1) NOT NULL DEFAULT 'M',
  filename_prefix VARCHAR(120),
  error_message TEXT,
  managed_link_id UUID,
  archived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE qr_jobs
  ADD COLUMN IF NOT EXISTS bulk_qr_type VARCHAR(32) NOT NULL DEFAULT 'URL';

ALTER TABLE qr_jobs
  ADD COLUMN IF NOT EXISTS managed_link_id UUID;

ALTER TABLE qr_jobs
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS managed_qr_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES qr_jobs(id) ON DELETE SET NULL,
  qr_type VARCHAR(32) NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  target_payload JSONB,
  expires_at TIMESTAMPTZ,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES qr_jobs(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  content TEXT,
  managed_link_id UUID,
  status VARCHAR(16) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  output_file_name TEXT,
  output_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE qr_job_items
  ADD COLUMN IF NOT EXISTS managed_link_id UUID;

CREATE TABLE IF NOT EXISTS job_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES qr_jobs(id) ON DELETE CASCADE,
  artifact_type VARCHAR(16) NOT NULL CHECK (artifact_type IN ('single-image', 'zip')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_type VARCHAR(24) NOT NULL CHECK (link_type IN ('gallery', 'pdf')),
  title VARCHAR(255),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rating_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  style VARCHAR(16) NOT NULL CHECK (style IN ('stars', 'numbers')),
  scale INTEGER NOT NULL CHECK (scale IN (5, 10)),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  source_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  questions JSONB NOT NULL,
  answers JSONB NOT NULL,
  source_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES qr_jobs(id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  event_value INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_phone_otps_user_id ON password_reset_phone_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_phone_otps_phone ON password_reset_phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_password_reset_phone_otps_code_hash ON password_reset_phone_otps(code_hash);
CREATE INDEX IF NOT EXISTS idx_qr_jobs_user_created_at ON qr_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_jobs_user_archived_at ON qr_jobs(user_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_qr_job_items_job_id ON qr_job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_qr_job_items_managed_link_id ON qr_job_items(managed_link_id);
CREATE INDEX IF NOT EXISTS idx_public_links_user_created_at ON public_links(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rating_submissions_created_at ON rating_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created_at ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_job_created_at ON analytics_events(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_managed_qr_links_user_created_at ON managed_qr_links(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_managed_qr_links_job_id ON managed_qr_links(job_id);
CREATE INDEX IF NOT EXISTS idx_managed_qr_links_expires_at ON managed_qr_links(expires_at);
