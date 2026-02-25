import { Controller, Get, Query } from '@nestjs/common'
import { StatsService } from './stats.service'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('season')
  async getSeasonStats(@Query('seasonId') seasonId: string) {
    if (!seasonId) {
      return { code: 400, msg: '缺少 seasonId 参数', data: null }
    }

    const client = getSupabaseClient()

    // 获取赛季信息
    const { data: season } = await client
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single()

    if (!season) {
      return { code: 404, msg: '赛季不存在', data: null }
    }

    // 获取该赛季所有未删除的战绩（按时间排序）
    const { data: matches } = await client
      .from('matches')
      .select('*')
      .eq('season_id', seasonId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    // 获取玩家统计数据
    const { data: playerStats } = await client
      .from('player_stats')
      .select('*')
      .eq('season_id', seasonId)
      .order('win_rate', { ascending: false })

    // 获取所有玩家信息
    const { data: players } = await client
      .from('players')
      .select('*')

    // 计算每个玩家的连胜/连败
    const streakMap = new Map<string, { streak: number; type: 'win' | 'lose' | 'none' }>()
    
    if (matches && matches.length > 0) {
      // 按时间顺序遍历战绩，计算连胜/连败
      for (const match of matches) {
        // 处理胜方玩家
        if (match.team1_players) {
          for (const playerId of match.team1_players) {
            const currentStreak = streakMap.get(playerId) || { streak: 0, type: 'none' }
            if (currentStreak.type === 'win') {
              streakMap.set(playerId, { streak: currentStreak.streak + 1, type: 'win' })
            } else {
              streakMap.set(playerId, { streak: 1, type: 'win' })
            }
          }
        }
        
        // 处理败方玩家
        if (match.team2_players) {
          for (const playerId of match.team2_players) {
            const currentStreak = streakMap.get(playerId) || { streak: 0, type: 'none' }
            if (currentStreak.type === 'lose') {
              streakMap.set(playerId, { streak: currentStreak.streak + 1, type: 'lose' })
            } else {
              streakMap.set(playerId, { streak: 1, type: 'lose' })
            }
          }
        }
      }
    }

    // 合并玩家名称并转换字段名为 camelCase，添加连胜/连败数据
    const playerStatsWithNames = (playerStats || []).map((stat) => {
      const player = players?.find((p) => p.id === stat.player_id)
      const streak = streakMap.get(stat.player_id) || { streak: 0, type: 'none' }
      return {
        id: stat.id,
        seasonId: stat.season_id,
        playerId: stat.player_id,
        playerName: player?.name || '未知玩家',
        totalMatches: stat.total_matches || 0,
        wins: stat.wins || 0,
        winRate: stat.win_rate || '0.00',
        streak: streak.streak,
        streakType: streak.type
      }
    })

    // 找出最佳战绩玩家
    const bestPlayer = playerStatsWithNames.length > 0
      ? playerStatsWithNames.reduce((best, current) => {
          const currentWinRate = parseFloat(current.winRate || '0')
          const bestWinRate = parseFloat(best.winRate || '0')
          return currentWinRate > bestWinRate ? current : best
        })
      : null

    // 赛季概览
    const summary = {
      seasonId: season.id,
      seasonName: season.name,
      totalMatches: matches?.length || 0,
      bestPlayer: bestPlayer?.playerName || '暂无',
      bestWinRate: bestPlayer ? `${bestPlayer.winRate}%` : '0.00%'
    }

    return {
      code: 200,
      msg: 'success',
      data: {
        summary,
        playerStats: playerStatsWithNames
      }
    }
  }
}

@Controller()
export class StatsControllerService {
  constructor(private readonly statsService: StatsService) {}
}
