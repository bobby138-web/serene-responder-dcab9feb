-- Add user_id columns to all tables for user isolation
ALTER TABLE chat_sessions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE mood_entries ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update chat_messages to ensure it has proper user tracking through sessions
-- (it already gets user_id through the session relationship)

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_session_id ON mood_entries(session_id);

-- Drop existing overly permissive RLS policies
DROP POLICY IF EXISTS "Anyone can manage chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Anyone can manage chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can manage media library" ON media_library;
DROP POLICY IF EXISTS "Anyone can view mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Anyone can create mood entries" ON mood_entries;

-- Create secure user-scoped RLS policies for chat_sessions
CREATE POLICY "Users can view their own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create secure user-scoped RLS policies for chat_messages
CREATE POLICY "Users can view messages from their own sessions"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their own sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their own sessions"
  ON chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Create secure user-scoped RLS policies for mood_entries
CREATE POLICY "Users can view their own mood entries"
  ON mood_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mood entries"
  ON mood_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood entries"
  ON mood_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood entries"
  ON mood_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Create secure user-scoped RLS policies for media_library
CREATE POLICY "Users can view their own media"
  ON media_library FOR SELECT
  USING (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = media_library.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own media"
  ON media_library FOR INSERT
  WITH CHECK (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = media_library.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own media"
  ON media_library FOR DELETE
  USING (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = media_library.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );