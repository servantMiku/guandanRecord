import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Injectable()
export class InitService {
  async initializeDatabase() {
    const client = getSupabaseClient()

    // 创建 players 表
    const { error: playersError } = await client.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS players (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(50) NOT NULL,
          avatar TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS players_name_idx ON players(name);
      `
    })

    if (playersError) {
      console.log('players表可能已存在或RPC不可用:', playersError.message)
      // 尝试直接查询，如果表不存在会报错
      const { error: checkError } = await client.from('players').select('id').limit(1)
      if (checkError && checkError.code === '42P01') {
        console.error('players表不存在且无法自动创建')
      }
    } else {
      console.log('players表检查/创建成功')
    }

    // 创建 seasons 表
    const { error: seasonsError } = await client.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS seasons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          start_date VARCHAR(10) NOT NULL,
          end_date VARCHAR(10),
          status VARCHAR(20) DEFAULT 'active' NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS seasons_status_idx ON seasons(status);
      `
    })

    if (seasonsError) {
      console.log('seasons表可能已存在或RPC不可用:', seasonsError.message)
    } else {
      console.log('seasons表检查/创建成功')
    }

    // 创建 matches 表
    const { error: matchesError } = await client.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS matches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          season_id VARCHAR(36) NOT NULL,
          team1_player1_id VARCHAR(36) NOT NULL,
          team1_player2_id VARCHAR(36) NOT NULL,
          team2_player1_id VARCHAR(36) NOT NULL,
          team2_player2_id VARCHAR(36) NOT NULL,
          winner_team INTEGER NOT NULL,
          score VARCHAR(20) NOT NULL,
          remark TEXT,
          is_deleted BOOLEAN DEFAULT false NOT NULL,
          deleted_at TIMESTAMPTZ,
          edit_history JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS matches_season_idx ON matches(season_id);
        CREATE INDEX IF NOT EXISTS matches_deleted_idx ON matches(is_deleted);
      `
    })

    if (matchesError) {
      console.log('matches表可能已存在或RPC不可用:', matchesError.message)
    } else {
      console.log('matches表检查/创建成功')
    }

    // 创建 player_stats 表
    const { error: statsError } = await client.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS player_stats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          season_id VARCHAR(36) NOT NULL,
          player_id VARCHAR(36) NOT NULL,
          total_matches INTEGER DEFAULT 0 NOT NULL,
          wins INTEGER DEFAULT 0 NOT NULL,
          win_rate VARCHAR(10) DEFAULT '0.00' NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS player_stats_season_idx ON player_stats(season_id);
        CREATE INDEX IF NOT EXISTS player_stats_player_idx ON player_stats(player_id);
      `
    })

    if (statsError) {
      console.log('player_stats表可能已存在或RPC不可用:', statsError.message)
    } else {
      console.log('player_stats表检查/创建成功')
    }
  }

  async initializeDefaultPlayers() {
    await this.initializeDatabase()

    const client = getSupabaseClient()

    // 检查是否已有玩家数据
    const { data: existingPlayers, error: checkError } = await client
      .from('players')
      .select('*')
      .limit(1)

    if (checkError) {
      console.error('检查玩家数据失败:', checkError)
      return
    }

    if (existingPlayers && existingPlayers.length > 0) {
      console.log('玩家数据已存在，跳过初始化')
      return
    }

    // 初始化 6 位默认玩家
    const defaultPlayers = [
      { name: 'A' },
      { name: 'B' },
      { name: 'C' },
      { name: 'D' },
      { name: 'E' },
      { name: 'F' }
    ]

    const { data, error } = await client
      .from('players')
      .insert(defaultPlayers)
      .select()

    if (error) {
      console.error('初始化默认玩家失败:', error)
    } else {
      console.log('默认玩家初始化成功:', data)
    }
  }
}
