import { Controller, Get, Query, Post, Body } from '@nestjs/common'
import { StatsService } from './stats.service'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('season')
  async getSeasonStats(@Query('seasonId') seasonId: string) {
    const client = getSupabaseClient()
    
    // 判断是否全量统计（不传 seasonId 或传 'all'）
    const isAllTime = !seasonId || seasonId === 'all'

    // 获取赛季信息（全量统计时获取所有赛季）
    let season: any = null
    if (!isAllTime) {
      const { data: seasonData } = await client
        .from('seasons')
        .select('*')
        .eq('id', seasonId)
        .single()
      
      if (!seasonData) {
        return { code: 404, msg: '赛季不存在', data: null }
      }
      season = seasonData
    } else {
      season = { id: 'all', name: '累计', status: 'all' }
    }

    // 获取战绩（按时间排序）
    let matchesQuery = client
      .from('matches')
      .select('*')
      .eq('is_deleted', false)
      
    if (!isAllTime) {
      matchesQuery = matchesQuery.eq('season_id', seasonId)
    }
    
    const { data: matches } = await matchesQuery.order('created_at', { ascending: true })

    // 获取玩家统计数据
    let playerStatsQuery = client
      .from('player_stats')
      .select('*')
      
    if (!isAllTime) {
      playerStatsQuery = playerStatsQuery.eq('season_id', seasonId)
    }
    
    const { data: playerStatsRaw } = await playerStatsQuery

    // 获取所有玩家信息
    const { data: players } = await client
      .from('players')
      .select('*')

    // 全量统计时，需要合并各赛季的玩家统计数据
    let playerStats: any[] = []
    if (isAllTime && playerStatsRaw) {
      // 按 player_id 合并数据
      const playerStatsMap = new Map<string, any>()
      for (const stat of playerStatsRaw) {
        const existing = playerStatsMap.get(stat.player_id)
        if (existing) {
          existing.total_matches += stat.total_matches || 0
          existing.wins += stat.wins || 0
        } else {
          playerStatsMap.set(stat.player_id, { ...stat })
        }
      }
      // 重新计算胜率
      playerStats = Array.from(playerStatsMap.values()).map((stat: any) => ({
        ...stat,
        win_rate: stat.total_matches > 0 
          ? ((stat.wins / stat.total_matches) * 100).toFixed(2) 
          : '0.00'
      }))
    } else {
      playerStats = playerStatsRaw || []
    }

    // 计算每个玩家的连胜/连败
    // 记录当前状态和最长记录
    const streakMap = new Map<string, { 
      currentStreak: number
      currentType: 'win' | 'lose' | 'none'
      maxWinStreak: number
      maxLoseStreak: number
    }>()
    
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
          const current = streakMap.get(playerId) || { 
            currentStreak: 0, 
            currentType: 'none' as const,
            maxWinStreak: 0,
            maxLoseStreak: 0
          }
          if (current.currentType === 'win') {
            current.currentStreak += 1
          } else {
            // 连胜中断，更新最大连败记录
            if (current.currentType === 'lose' && current.currentStreak > current.maxLoseStreak) {
              current.maxLoseStreak = current.currentStreak
            }
            current.currentStreak = 1
            current.currentType = 'win'
          }
          // 更新最大连胜记录
          if (current.currentStreak > current.maxWinStreak) {
            current.maxWinStreak = current.currentStreak
          }
          streakMap.set(playerId, current)
        }

        for (const playerId of loserTeam) {
          const current = streakMap.get(playerId) || { 
            currentStreak: 0, 
            currentType: 'none' as const,
            maxWinStreak: 0,
            maxLoseStreak: 0
          }
          if (current.currentType === 'lose') {
            current.currentStreak += 1
          } else {
            // 连败中断，更新最大连胜记录
            if (current.currentType === 'win' && current.currentStreak > current.maxWinStreak) {
              current.maxWinStreak = current.currentStreak
            }
            current.currentStreak = 1
            current.currentType = 'lose'
          }
          // 更新最大连败记录
          if (current.currentStreak > current.maxLoseStreak) {
            current.maxLoseStreak = current.currentStreak
          }
          streakMap.set(playerId, current)
        }

        // 计算搭档统计
        // 队伍1的搭档
        if (team1Players.length >= 2) {
          const p1 = team1Players[0]
          const p2 = team1Players[1]
          // 排序后生成key，确保A+B和B+A是同一个key
          const sortedIds = [p1, p2].sort()
          const key = sortedIds.join('_')
          // 使用排序后的顺序存储，确保显示一致
          const sortedP1 = sortedIds[0]
          const sortedP2 = sortedIds[1]
          
          const existing = partnerStatsMap.get(key) || {
            player1Id: sortedP1,
            player2Id: sortedP2,
            player1Name: players?.find(p => p.id === sortedP1)?.name || '未知',
            player2Name: players?.find(p => p.id === sortedP2)?.name || '未知',
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
          // 排序后生成key，确保A+B和B+A是同一个key
          const sortedIds = [p1, p2].sort()
          const key = sortedIds.join('_')
          // 使用排序后的顺序存储，确保显示一致
          const sortedP1 = sortedIds[0]
          const sortedP2 = sortedIds[1]
          
          const existing = partnerStatsMap.get(key) || {
            player1Id: sortedP1,
            player2Id: sortedP2,
            player1Name: players?.find(p => p.id === sortedP1)?.name || '未知',
            player2Name: players?.find(p => p.id === sortedP2)?.name || '未知',
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

    // 转换搭档统计为数组并排序
    // 排序规则：
    // 1. 场次 >= 3 的搭档优先（设置最小场次门槛，避免只合作1-2场的偶然高分）
    // 2. 按胜率降序
    // 3. 胜率相同按胜场降序
    const MIN_MATCHES_THRESHOLD = 3 // 最小场次门槛
    
    const partnerStats = Array.from(partnerStatsMap.values()).sort((a, b) => {
      // 先按是否达到门槛排序（达到门槛的优先）
      const aQualified = a.totalMatches >= MIN_MATCHES_THRESHOLD ? 1 : 0
      const bQualified = b.totalMatches >= MIN_MATCHES_THRESHOLD ? 1 : 0
      if (aQualified !== bQualified) return bQualified - aQualified
      
      // 再按胜率排序
      const winRateDiff = parseFloat(b.winRate) - parseFloat(a.winRate)
      if (winRateDiff !== 0) return winRateDiff
      
      // 胜率相同按胜场排序
      return b.wins - a.wins
    })

    // 找出最佳搭档（必须达到最小场次门槛）
    const qualifiedPartners = partnerStats.filter(p => p.totalMatches >= MIN_MATCHES_THRESHOLD)
    const bestPartner = qualifiedPartners.length > 0 ? qualifiedPartners[0] : null

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
      const streak = streakMap.get(stat.player_id) || { 
        currentStreak: 0, 
        currentType: 'none' as const,
        maxWinStreak: 0,
        maxLoseStreak: 0
      }
      return {
        id: stat.id,
        seasonId: stat.season_id,
        playerId: stat.player_id,
        playerName: player?.name || '未知玩家',
        totalMatches: stat.total_matches || 0,
        wins: stat.wins || 0,
        winRate: stat.win_rate || '0.00',
        streak: streak.currentStreak,
        streakType: streak.currentType,
        maxWinStreak: streak.maxWinStreak,
        maxLoseStreak: streak.maxLoseStreak
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

    // 找出最长连胜和最长连败
    let longestWinStreak = { playerName: '', streak: 0 }
    let longestLoseStreak = { playerName: '', streak: 0 }
    
    for (const [playerId, streakInfo] of streakMap.entries()) {
      const playerName = players?.find(p => p.id === playerId)?.name || '未知'
      if (streakInfo.maxWinStreak > longestWinStreak.streak) {
        longestWinStreak = { playerName, streak: streakInfo.maxWinStreak }
      }
      if (streakInfo.maxLoseStreak > longestLoseStreak.streak) {
        longestLoseStreak = { playerName, streak: streakInfo.maxLoseStreak }
      }
    }

    // 赛季概览
    const summary = {
      seasonId: season.id,
      seasonName: season.name,
      totalMatches: matches?.length || 0,
      bestPlayer: bestPlayer?.playerName || '暂无',
      bestWinRate: bestPlayer ? `${bestPlayer.winRate}%` : '0.00%',
      bestPartner: bestPartner ? `${bestPartner.player1Name} + ${bestPartner.player2Name}` : '暂无',
      bestPartnerWinRate: bestPartner ? `${bestPartner.winRate}%` : '0.00%',
      bestPartnerWins: bestPartner?.wins || 0,
      longestWinStreak: longestWinStreak.streak > 0 ? longestWinStreak : null,
      longestLoseStreak: longestLoseStreak.streak > 0 ? longestLoseStreak : null
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

  @Get('export')
  async exportAllData() {
    const client = getSupabaseClient()

    try {
      // 获取所有表数据
      const [{ data: players }, { data: seasons }, { data: matches }, { data: playerStats }] = await Promise.all([
        client.from('players').select('*'),
        client.from('seasons').select('*'),
        client.from('matches').select('*'),
        client.from('player_stats').select('*')
      ])

      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        players: players || [],
        seasons: seasons || [],
        matches: matches || [],
        playerStats: playerStats || []
      }

      return {
        code: 200,
        msg: 'success',
        data: exportData
      }
    } catch (error) {
      console.error('导出数据失败:', error)
      return { code: 500, msg: '导出数据失败', data: null }
    }
  }

  @Post('import')
  async importAllData(@Body() body: { data: any }) {
    const client = getSupabaseClient()

    try {
      const { players, seasons, matches, playerStats } = body.data

      // 清空现有数据（按依赖顺序）
      await client.from('player_stats').delete().neq('id', '0')
      await client.from('matches').delete().neq('id', '0')
      await client.from('seasons').delete().neq('id', '0')
      await client.from('players').delete().neq('id', '0')

      // 导入数据（按依赖顺序反向）
      if (players && players.length > 0) {
        await client.from('players').insert(players.map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          created_at: p.created_at
        })))
      }

      if (seasons && seasons.length > 0) {
        await client.from('seasons').insert(seasons.map((s: any) => ({
          id: s.id,
          name: s.name,
          start_date: s.start_date,
          end_date: s.end_date,
          status: s.status,
          created_at: s.created_at
        })))
      }

      if (matches && matches.length > 0) {
        await client.from('matches').insert(matches.map((m: any) => ({
          id: m.id,
          season_id: m.season_id,
          team1_player1_id: m.team1_player1_id,
          team1_player2_id: m.team1_player2_id,
          team2_player1_id: m.team2_player1_id,
          team2_player2_id: m.team2_player2_id,
          winner_team: m.winner_team,
          score: m.score,
          remark: m.remark,
          match_time: m.match_time,
          is_deleted: m.is_deleted,
          edit_history: m.edit_history,
          created_at: m.created_at,
          updated_at: m.updated_at
        })))
      }

      if (playerStats && playerStats.length > 0) {
        await client.from('player_stats').insert(playerStats.map((s: any) => ({
          id: s.id,
          season_id: s.season_id,
          player_id: s.player_id,
          total_matches: s.total_matches,
          wins: s.wins,
          win_rate: s.win_rate,
          created_at: s.created_at,
          updated_at: s.updated_at
        })))
      }

      return { code: 200, msg: '数据导入成功', data: null }
    } catch (error) {
      console.error('导入数据失败:', error)
      return { code: 500, msg: '导入数据失败', data: null }
    }
  }
}

@Controller()
export class StatsControllerService {
  constructor(private readonly statsService: StatsService) {}
}
