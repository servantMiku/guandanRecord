-- ============================================
-- 掼蛋战绩小程序 - 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行
-- ============================================

-- 清空旧数据（按依赖顺序）
DELETE FROM player_stats;
DELETE FROM matches;
DELETE FROM seasons;
DELETE FROM players;
DELETE FROM app_config;
DELETE FROM health_check;

-- ============================================
-- 1. health_check（健康检查）
-- ============================================
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. seasons（赛季）
-- ============================================
CREATE TABLE IF NOT EXISTS seasons (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  start_date VARCHAR(10) NOT NULL,      -- YYYY-MM-DD
  end_date VARCHAR(10),                 -- YYYY-MM-DD
  total_matches INTEGER,                -- 赛季总场次（空=不限制）
  current_matches INTEGER NOT NULL DEFAULT 0,  -- 当前已进行场次
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, ended
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS seasons_status_idx ON seasons(status);

-- ============================================
-- 3. players（玩家）
-- ============================================
CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS players_name_idx ON players(name);

-- ============================================
-- 4. matches（战绩）
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id VARCHAR(36) NOT NULL,
  team1_player1_id VARCHAR(36) NOT NULL,
  team1_player2_id VARCHAR(36) NOT NULL,
  team2_player1_id VARCHAR(36) NOT NULL,
  team2_player2_id VARCHAR(36) NOT NULL,
  winner_team INTEGER NOT NULL,          -- 1 or 2
  score VARCHAR(20) NOT NULL,            -- 如 "队伍1：A2，队伍2：6"
  remark TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  edit_history JSONB,                    -- 编辑历史记录
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS matches_season_idx ON matches(season_id);
CREATE INDEX IF NOT EXISTS matches_deleted_idx ON matches(is_deleted);

-- ============================================
-- 5. player_stats（玩家统计）
-- ============================================
CREATE TABLE IF NOT EXISTS player_stats (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id VARCHAR(36) NOT NULL,
  player_id VARCHAR(36) NOT NULL,
  total_matches INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  win_rate VARCHAR(10) NOT NULL DEFAULT '0.00',  -- 百分比字符串
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS player_stats_season_idx ON player_stats(season_id);
CREATE INDEX IF NOT EXISTS player_stats_player_idx ON player_stats(player_id);

-- ============================================
-- 6. app_config（应用配置）
-- ============================================
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
