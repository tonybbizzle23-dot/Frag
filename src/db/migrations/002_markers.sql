-- FragClip desktop companion highlight markers
CREATE TABLE IF NOT EXISTS markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    window_title TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_markers_user_session ON markers(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_markers_timestamp ON markers(timestamp);
