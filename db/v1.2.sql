-- ============================================
-- v1.2 - 玩家-用户绑定
-- players 表新增 user_id，支持用户绑定到玩家
-- ============================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT players_user_id_unique UNIQUE (user_id);

CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);
