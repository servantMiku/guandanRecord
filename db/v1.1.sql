-- ============================================
-- v1.1 - 新增操作日志表
-- 记录用户操作审计日志（新增/修改战绩、配置变更等）
-- ============================================

CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS operation_logs_user_idx ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS operation_logs_action_idx ON operation_logs(action);
CREATE INDEX IF NOT EXISTS operation_logs_created_idx ON operation_logs(created_at);
