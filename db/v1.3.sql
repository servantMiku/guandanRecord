-- ============================================
-- v1.3 - player_stats 表添加唯一约束
-- 防止 (season_id, player_id) 出现重复记录
-- 避免 updatePlayerStatsIncremental 中 .single() 查询因重复行而失败
-- ============================================

-- 1. 清理重复记录（如有），保留每个 (season_id, player_id) 最新的一条
DELETE FROM player_stats p1 USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY season_id, player_id ORDER BY created_at DESC
  ) AS rn
  FROM player_stats
) p2
WHERE p1.id = p2.id AND p2.rn > 1;

-- 2. 添加唯一约束
ALTER TABLE player_stats
  ADD CONSTRAINT player_stats_season_player_unique UNIQUE (season_id, player_id);
