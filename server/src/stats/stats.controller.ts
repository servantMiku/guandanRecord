import { Controller, Get, Query, Post, Body } from '@nestjs/common'
import { StatsService } from './stats.service'
import { getSupabaseClient } from '../storage/database/supabase-client'

// 奖项类型定义
type Award = {
  id: string
  name: string
  icon: string
  description: string
  rule: string           // 新增：奖项规则说明
  playerId?: string
  playerName?: string
  playerIds?: string[]
  playerNames?: string[]
  type: 'individual' | 'team'
}

// 计算所有奖项
const calculateAwards = (
  playerStats: any[],
  players: any[],
  currentSeasonId: string,
  isAllTime: boolean,
  client: any
): Award[] => {
  const awards: Award[] = []

  if (playerStats.length === 0) return awards

  // 1. 🏆 胜率之王
  const winRateKing = [...playerStats].sort((a, b) => 
    parseFloat(b.winRate) - parseFloat(a.winRate)
  )[0]
  if (winRateKing) {
    awards.push({
      id: 'win-rate-king',
      name: '胜率之王',
      icon: '🏆',
      description: `${winRateKing.winRate}%`,
      rule: '胜率最高的玩家',
      playerId: winRateKing.playerId,
      playerName: winRateKing.playerName,
      type: 'individual'
    })
  }

  // 2. 💎 掼蛋大富翁（胜3分 + 负1分）
  const playerWithScores = playerStats.map(p => ({
    ...p,
    totalScore: p.wins * 3 + (p.totalMatches - p.wins) * 1
  }))
  const richPlayer = [...playerWithScores].sort((a, b) => 
    b.totalScore - a.totalScore
  )[0]
  if (richPlayer) {
    awards.push({
      id: 'rich-player',
      name: '掼蛋大富翁',
      icon: '💎',
      description: `${richPlayer.totalScore} 积分`,
      rule: '胜一场积3分，负一场积1分，总积分最高',
      playerId: richPlayer.playerId,
      playerName: richPlayer.playerName,
      type: 'individual'
    })
  }

  // 3. ⚡ 金牌收割机（积分效率）
  const playerWithEfficiency = playerWithScores.map(p => ({
    ...p,
    efficiency: p.totalMatches > 0 ? (p.totalScore / p.totalMatches).toFixed(1) : '0'
  }))
  const efficiencyKing = [...playerWithEfficiency].sort((a, b) => 
    parseFloat(b.efficiency) - parseFloat(a.efficiency)
  )[0]
  if (efficiencyKing) {
    awards.push({
      id: 'efficiency-king',
      name: '金牌收割机',
      icon: '⚡',
      description: `${efficiencyKing.efficiency} 分/场`,
      rule: '场均积分最高（积分效率）',
      playerId: efficiencyKing.playerId,
      playerName: efficiencyKing.playerName,
      type: 'individual'
    })
  }

  // 4. 🎪 全场最靓仔（参赛场次最多）
  const mostActive = [...playerStats].sort((a, b) => 
    b.totalMatches - a.totalMatches
  )[0]
  if (mostActive) {
    awards.push({
      id: 'most-active',
      name: '全场最靓仔',
      icon: '🎪',
      description: `${mostActive.totalMatches} 场`,
      rule: '参赛场次最多的劳模玩家',
      playerId: mostActive.playerId,
      playerName: mostActive.playerName,
      type: 'individual'
    })
  }

  // 5. 🔥 火力全开（胜场数最多）
  const mostWins = [...playerStats].sort((a, b) => 
    b.wins - a.wins
  )[0]
  if (mostWins) {
    awards.push({
      id: 'most-wins',
      name: '火力全开',
      icon: '🔥',
      description: `${mostWins.wins} 胜`,
      rule: '胜场数最多的玩家',
      playerId: mostWins.playerId,
      playerName: mostWins.playerName,
      type: 'individual'
    })
  }

  // 6. 📈 进步之星（需要对比上赛季，仅单赛季模式）
  if (!isAllTime && currentSeasonId && currentSeasonId !== 'all') {
    // 这里简化处理，实际可以查询上一赛季数据
    // 暂时不评选进步之星，或者可以给一个默认
  }

  // 7. 🎲 逆袭王（输球场次多但胜率还不错）
  const playersWithLosses = playerStats
    .map(p => ({
      ...p,
      losses: p.totalMatches - p.wins,
      comebackScore: (p.totalMatches - p.wins) * parseFloat(p.winRate) / 100
    }))
    .filter(p => p.losses > 0)
  
  if (playersWithLosses.length > 0) {
    // 先找出平均输球场次
    const avgLosses = playersWithLosses.reduce((sum, p) => sum + p.losses, 0) / playersWithLosses.length
    // 筛选出输球场次 >= 平均的玩家
    const eligiblePlayers = playersWithLosses.filter(p => p.losses >= avgLosses)
    
    if (eligiblePlayers.length > 0) {
      // 在 eligiblePlayers 中按胜率排序
      const comebackKing = eligiblePlayers.sort((a, b) => 
        parseFloat(b.winRate) - parseFloat(a.winRate)
      )[0]
      
      if (comebackKing) {
        awards.push({
          id: 'comeback-king',
          name: '逆袭王',
          icon: '🎲',
          description: `${comebackKing.losses} 负仍有 ${comebackKing.winRate}% 胜率`,
          rule: '输球场次多但胜率依然可观，韧性极强',
          playerId: comebackKing.playerId,
          playerName: comebackKing.playerName,
          type: 'individual'
        })
      }
    }
  }

  return awards
}

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('season')
  async getSeasonStats(@Query('seasonId') seasonId: string) {
    console.log('获取赛季统计请求 - 赛季ID:', seasonId)
    const client = getSupabaseClient()
    
    // 判断是否全量统计（不传 seasonId 或传 'all'）
    const isAllTime = !seasonId || seasonId === 'all'
    console.log('统计模式:', isAllTime ? '全量累计' : '指定赛季')

    // 获取赛季信息（全量统计时获取所有赛季）
    let season: any = null
    if (!isAllTime) {
      const { data: seasonData } = await client
        .from('seasons')
        .select('*')
        .eq('id', seasonId)
        .single()
      
      if (!seasonData) {
        console.log('赛季不存在 - ID:', seasonId)
        return { code: 404, msg: '赛季不存在', data: null }
      }
      season = seasonData
      console.log('赛季信息:', season.name)
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
      // 遍历所有玩家，确保每个玩家都有记录（即使数据为 0）
      playerStats = (players || []).map(player => {
        const existingStat = playerStatsMap.get(player.id)
        return {
          id: existingStat?.id || `temp-goat-${player.id}`,
          player_id: player.id,
          season_id: 'all',
          total_matches: existingStat?.total_matches || 0,
          wins: existingStat?.wins || 0,
          win_rate: existingStat ? 
            (existingStat.total_matches > 0 ? 
              ((existingStat.wins / existingStat.total_matches) * 100).toFixed(2) : 
              '0.00') : 
            '0.00'
        }
      })
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
    // 确保所有玩家都显示，即使没有比赛记录
    const playerStatsMap = new Map(
      (playerStats || []).map(stat => [stat.player_id, stat])
    )
    
    const playerStatsWithNames = (players || []).map(player => {
      const stat = playerStatsMap.get(player.id)
      const streak = streakMap.get(player.id) || { 
        currentStreak: 0, 
        currentType: 'none' as const,
        maxWinStreak: 0,
        maxLoseStreak: 0
      }
      return {
        id: stat?.id || `temp-${player.id}`,
        seasonId: stat?.season_id || seasonId,
        playerId: player.id,
        playerName: player.name,
        totalMatches: stat?.total_matches || 0,
        wins: stat?.wins || 0,
        winRate: stat?.win_rate || '0.00',
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

    // 计算所有奖项
    const awards = calculateAwards(playerStatsWithNames, players || [], seasonId, isAllTime, client)

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

    // 统计计算完成

    return {
      code: 200,
      msg: 'success',
      data: {
        summary,
        playerStats: playerStatsWithNames,
        partnerStats,
        playerPairMatrix,
        awards
      }
    }
  }

  @Get('export')
  async exportAllData() {
    console.log('导出数据请求')
    const client = getSupabaseClient()

    try {
      console.log('开始获取所有表数据...')
      // 获取所有表数据
      const [{ data: players }, { data: seasons }, { data: matches }, { data: playerStats }] = await Promise.all([
        client.from('players').select('*'),
        client.from('seasons').select('*'),
        client.from('matches').select('*'),
        client.from('player_stats').select('*')
      ])

      console.log('数据获取完成:')
      console.log('  - 玩家数量:', players?.length || 0)
      console.log('  - 赛季数量:', seasons?.length || 0)
      console.log('  - 战绩数量:', matches?.length || 0)
      console.log('  - 统计记录数量:', playerStats?.length || 0)

      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        players: players || [],
        seasons: seasons || [],
        matches: matches || [],
        playerStats: playerStats || []
      }

      console.log('导出数据准备完成')
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
    console.log('导入数据请求')
    const client = getSupabaseClient()

    try {
      const { players, seasons, matches, playerStats } = body.data

      console.log('准备导入的数据量:')
      console.log('  - 玩家数量:', players?.length || 0)
      console.log('  - 赛季数量:', seasons?.length || 0)
      console.log('  - 战绩数量:', matches?.length || 0)
      console.log('  - 统计记录数量:', playerStats?.length || 0)

      console.log('开始清空现有数据...')
      // 清空现有数据（按依赖顺序）
      await client.from('player_stats').delete().neq('id', '0')
      await client.from('matches').delete().neq('id', '0')
      await client.from('seasons').delete().neq('id', '0')
      await client.from('players').delete().neq('id', '0')
      console.log('现有数据已清空')

      // 导入数据（按依赖顺序反向）
      if (players && players.length > 0) {
        console.log('开始导入玩家数据...')
        const { error: playersError } = await client.from('players').insert(players.map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          created_at: p.created_at
        })))
        if (playersError) {
          console.error('导入 players 失败:', playersError)
          throw playersError
        }
        console.log('玩家数据导入成功，数量:', players.length)
      }

      if (seasons && seasons.length > 0) {
        console.log('开始导入赛季数据...')
        const { error: seasonsError } = await client.from('seasons').insert(seasons.map((s: any) => ({
          id: s.id,
          name: s.name,
          start_date: s.start_date,
          end_date: s.end_date,
          status: s.status,
          created_at: s.created_at
        })))
        if (seasonsError) {
          console.error('导入 seasons 失败:', seasonsError)
          throw seasonsError
        }
        console.log('赛季数据导入成功，数量:', seasons.length)
      }

      if (matches && matches.length > 0) {
        console.log('开始导入战绩数据...')
        const { error: matchesError } = await client.from('matches').insert(matches.map((m: any) => ({
          id: m.id,
          season_id: m.season_id,
          team1_player1_id: m.team1_player1_id,
          team1_player2_id: m.team1_player2_id,
          team2_player1_id: m.team2_player1_id,
          team2_player2_id: m.team2_player2_id,
          winner_team: m.winner_team,
          score: m.score,
          remark: m.remark,
          is_deleted: m.is_deleted ?? false,
          deleted_at: m.deleted_at,
          edit_history: m.edit_history,
          created_at: m.created_at,
          updated_at: m.updated_at
        })))
        if (matchesError) {
          console.error('导入 matches 失败:', matchesError)
          throw matchesError
        }
        console.log('战绩数据导入成功，数量:', matches.length)
      }

      if (playerStats && playerStats.length > 0) {
        console.log('开始导入玩家统计数据...')
        const { error: statsError } = await client.from('player_stats').insert(playerStats.map((s: any) => ({
          id: s.id,
          season_id: s.season_id,
          player_id: s.player_id,
          total_matches: s.total_matches,
          wins: s.wins,
          win_rate: s.win_rate,
          created_at: s.created_at,
          updated_at: s.updated_at
        })))
        if (statsError) {
          console.error('导入 player_stats 失败:', statsError)
          throw statsError
        }
        console.log('玩家统计数据导入成功，数量:', playerStats.length)
      }

      console.log('所有数据导入成功完成')
      return { code: 200, msg: '数据导入成功', data: null }
    } catch (error) {
      console.error('导入数据失败:', error)
      return { code: 500, msg: '导入数据失败: ' + (error as Error).message, data: null }
    }
  }
}

@Controller()
export class StatsControllerService {
  constructor(private readonly statsService: StatsService) {}
}
