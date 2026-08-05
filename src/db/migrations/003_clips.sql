CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  marker_index INTEGER NOT NULL,
  marker_time NUMERIC,
  landscape_storage_key TEXT,
  vertical_storage_key TEXT,
  thumbnail_storage_key TEXT,
  original_filename TEXT,
  game TEXT,
  duration_seconds NUMERIC,
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clips_user_created ON clips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_video ON clips(user_id, video_id);
