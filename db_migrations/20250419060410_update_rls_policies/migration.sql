-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filter ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

DROP POLICY IF EXISTS "Users can view their own trade records" ON trade_records;
DROP POLICY IF EXISTS "Users can insert their own trade records" ON trade_records;
DROP POLICY IF EXISTS "Users can update their own trade records" ON trade_records;
DROP POLICY IF EXISTS "Users can delete their own trade records" ON trade_records;

DROP POLICY IF EXISTS "Users can view their own trade files" ON trade_files;
DROP POLICY IF EXISTS "Users can insert their own trade files" ON trade_files;
DROP POLICY IF EXISTS "Users can update their own trade files" ON trade_files;
DROP POLICY IF EXISTS "Users can delete their own trade files" ON trade_files;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON chat_messages;

DROP POLICY IF EXISTS "Users can view their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can insert their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can delete their own chat rooms" ON chat_rooms;

DROP POLICY IF EXISTS "Users can view their own saved filters" ON saved_filter;
DROP POLICY IF EXISTS "Users can insert their own saved filters" ON saved_filter;
DROP POLICY IF EXISTS "Users can update their own saved filters" ON saved_filter;
DROP POLICY IF EXISTS "Users can delete their own saved filters" ON saved_filter;

-- usersテーブルのポリシー
CREATE POLICY "Users can view their own data"
ON users FOR SELECT
USING (auth.uid()::text = "supabaseId");

CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
USING (auth.uid()::text = "supabaseId")
WITH CHECK (auth.uid()::text = "supabaseId");

-- trade_recordsテーブルのポリシー
CREATE POLICY "Users can view their own trade records"
ON trade_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_records."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can insert their own trade records"
ON trade_records FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_records."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own trade records"
ON trade_records FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_records."userId"
    AND users."supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_records."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete their own trade records"
ON trade_records FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_records."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

-- trade_filesテーブルのポリシー
CREATE POLICY "Users can view their own trade files"
ON trade_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_files."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can insert their own trade files"
ON trade_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_files."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own trade files"
ON trade_files FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_files."userId"
    AND users."supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_files."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete their own trade files"
ON trade_files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = trade_files."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

-- chat_messagesテーブルのポリシー
CREATE POLICY "Users can view their own chat messages"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_messages."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can insert their own chat messages"
ON chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_messages."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own chat messages"
ON chat_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_messages."userId"
    AND users."supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_messages."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete their own chat messages"
ON chat_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_messages."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

-- chat_roomsテーブルのポリシー
CREATE POLICY "Users can view their own chat rooms"
ON chat_rooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_rooms."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can insert their own chat rooms"
ON chat_rooms FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_rooms."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own chat rooms"
ON chat_rooms FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_rooms."userId"
    AND users."supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_rooms."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete their own chat rooms"
ON chat_rooms FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = chat_rooms."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

-- saved_filterテーブルのポリシー
CREATE POLICY "Users can view their own saved filters"
ON saved_filter FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = saved_filter."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can insert their own saved filters"
ON saved_filter FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = saved_filter."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own saved filters"
ON saved_filter FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = saved_filter."userId"
    AND users."supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = saved_filter."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete their own saved filters"
ON saved_filter FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = saved_filter."userId"
    AND users."supabaseId" = auth.uid()::text
  )
);

-- 認証されたユーザーにpublicスキーマの使用権限を付与
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- 将来作成されるテーブルに対しても同様の権限を自動的に付与
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;
