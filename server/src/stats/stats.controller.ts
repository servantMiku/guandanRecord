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

    // 获取该赛季所有未删除的战绩
    const { data: matches } = await client
      .from('matches')
      .select('*')
      .eq('season_id', seasonId)
      .eq('is_deleted', false)

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

    // 合并玩家名称并转换字段名为 camelCase
    const playerStatsWithNames = (playerStats || []).map((stat) => {
      const player = players?.find((p) => p.id === stat.player_id)
      return {
        id: stat.id,
        seasonId: stat.season_id,
        playerId: stat.player_id,
        playerName: player?.name || '未知玩家',
        totalMatches: stat.total_matches || 0,
        wins: stat.wins || 0,
        winRate: stat.win_rate || '0.00'
      }
    })

    // 找出最佳战绩玩家
    const bestPlayer = playerStatsWithNames.length > 0
      ? playerStatsWithNames.reduce((best, current) => {
          const currentWinRate = parseFloat(current.win_rate || '0')
          const bestWinRate = parseFloat(best.win_rate || '0')
          return currentWinRate > bestWinRate ? current : best
        })
      : null

    // 赛季概览
    const summary = {
      seasonId: season.id,
      seasonName: season.name,
      totalMatches: matches?.length || 0,
      bestPlayer: bestPlayer?.playerName || '暂无',
      bestWinRate: bestPlayer ? `${bestPlayer.win_rate}%` : '0.00%'
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
