-- Add session_id to mood_entries to link moods with conversations
ALTER TABLE mood_entries 
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES chat_sessions(id);

-- Add index for faster queries (only if not exists)
CREATE INDEX IF NOT EXISTS idx_mood_entries_session_id ON mood_entries(session_id);