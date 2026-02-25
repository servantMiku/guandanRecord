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

    // 获取所有玩家信息
    const { data: players } = await client
      .from('players')
      .select('*')

    // 计算每个玩家的连胜/连败
    const streakMap = new Map<string, { streak: number; type: 'win' | 'lose' | 'none' }>()
    
    // 计算搭档合作统计数据
    // key: "playerAId_playerBId" (按字母顺序排序，确保唯一性)
    const partnerStatsMap = new Map<string, {
      player1Id: string
      player2Id: string
      player1Name: string
      player2Name: string
      totalMatches: number
      wins: number
      winRate: string
    }>()

    if (matches && matches.length > 0) {
      // 按时间顺序遍历战绩，计算连胜/连败和搭档统计
      for (const match of matches) {
        // 从独立字段构建玩家数组
        const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean)
        const team2Players = [match.team2_player1_id, match.team2_player2_id].filter(Boolean)
        const isTeam1Win = match.winner_team === 1

        // 处理胜方玩家连胜/连败
        const winnerTeam = isTeam1Win ? team1Players : team2Players
        const loserTeam = isTeam1Win ? team2Players : team1Players

        for (const playerId of winnerTeam) {
          const currentStreak = streakMap.get(playerId) || { streak: 0, type: 'none' }
          if (currentStreak.type === 'win') {
            streakMap.set(playerId, { streak: currentStreak.streak + 1, type: 'win' })
          } else {
            streakMap.set(playerId, { streak: 1, type: 'win' })
          }
        }

        for (const playerId of loserTeam) {
          const currentStreak = streakMap.get(playerId) || { streak: 0, type: 'none' }
          if (currentStreak.type === 'lose') {
            streakMap.set(playerId, { streak: currentStreak.streak + 1, type: 'lose' })
          } else {
            streakMap.set(playerId, { streak: 1, type: 'lose' })
          }
        }

        // 计算搭档统计
        // 队伍1的搭档
        if (team1Players.length >= 2) {
          const p1 = team1Players[0]
          const p2 = team1Players[1]
          const key = [p1, p2].sort().join('_')
          
          const existing = partnerStatsMap.get(key) || {
            player1Id: p1,
            player2Id: p2,
            player1Name: players?.find(p => p.id === p1)?.name || '未知',
            player2Name: players?.find(p => p.id === p2)?.name || '未知',
            totalMatches: 0,
            wins: 0,
            winRate: '0.00'
          }
          
          existing.totalMatches += 1
          if (isTeam1Win) {
            existing.wins += 1
          }
          existing.winRate = ((existing.wins / existing.totalMatches) * 100).toFixed(2)
          partnerStatsMap.set(key, existing)
        }

        // 队伍2的搭档
        if (team2Players.length >= 2) {
          const p1 = team2Players[0]
          const p2 = team2Players[1]
          const key = [p1, p2].sort().join('_')
          
          const existing = partnerStatsMap.get(key) || {
            player1Id: p1,
            player2Id: p2,
            player1Name: players?.find(p => p.id === p1)?.name || '未知',
            player2Name: players?.find(p => p.id === p2)?.name || '未知',
            totalMatches: 0,
            wins: 0,
            winRate: '0.00'
          }
          
          existing.totalMatches += 1
          if (!isTeam1Win) {
            existing.wins += 1
          }
          existing.winRate = ((existing.wins / existing.totalMatches) * 100).toFixed(2)
          partnerStatsMap.set(key, existing)
        }
      }
    }

    // 转换搭档统计为数组并按胜率、胜场排序
    const partnerStats = Array.from(partnerStatsMap.values()).sort((a, b) => {
      const winRateDiff = parseFloat(b.winRate) - parseFloat(a.winRate)
      if (winRateDiff !== 0) return winRateDiff
      return b.wins - a.wins
    })

    // 找出最佳搭档
    const bestPartner = partnerStats.length > 0 ? partnerStats[0] : null

    // 构建玩家两两胜率矩阵
    const playerPairMatrix: Array<{
      playerId: string
      playerName: string
      partners: Array<{
        partnerId: string
        partnerName: string
        totalMatches: number
        wins: number
        winRate: string
      }>
    }> = []

    if (players && players.length > 0) {
      for (const player of players) {
        const partners: Array<{
          partnerId: string
          partnerName: string
          totalMatches: number
          wins: number
          winRate: string
        }> = []

        for (const otherPlayer of players) {
          if (player.id === otherPlayer.id) continue

          // 查找这对搭档的统计数据
          const key = [player.id, otherPlayer.id].sort().join('_')
          const partnerStat = partnerStatsMap.get(key)

          partners.push({
            partnerId: otherPlayer.id,
            partnerName: otherPlayer.name,
            totalMatches: partnerStat?.totalMatches || 0,
            wins: partnerStat?.wins || 0,
            winRate: partnerStat?.winRate || '0.00'
          })
        }

        // 按胜率排序
        partners.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))

        playerPairMatrix.push({
          playerId: player.id,
          playerName: player.name,
          partners
        })
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
      bestWinRate: bestPlayer ? `${bestPlayer.winRate}%` : '0.00%',
      bestPartner: bestPartner ? `${bestPartner.player1Name} + ${bestPartner.player2Name}` : '暂无',
      bestPartnerWinRate: bestPartner ? `${bestPartner.winRate}%` : '0.00%',
      bestPartnerWins: bestPartner?.wins || 0
    }

    return {
      code: 200,
      msg: 'success',
      data: {
        summary,
        playerStats: playerStatsWithNames,
        partnerStats,
        playerPairMatrix
      }
    }
  }
}

@Controller()
export class StatsControllerService {
  constructor(private readonly statsService: StatsService) {}
}
