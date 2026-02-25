import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common'
import { MatchesService } from './matches.service'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  async getAllMatches(@Query('limit') limit?: string, @Query('seasonId') seasonId?: string) {
    const client = getSupabaseClient()

    // 先获取战绩数据（不包含关联查询）
    let query = client
      .from('matches')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // 按赛季筛选
    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: matches, error } = await query

    if (error) {
      console.error('获取战绩列表失败:', error)
      return { code: 500, msg: '获取战绩列表失败', data: null }
    }

    // 获取所有赛季信息
    const { data: seasons } = await client
      .from('seasons')
      .select('*')

    // 在代码中关联数据
    const matchesWithSeasons = (matches || []).map(match => {
      const season = seasons?.find(s => s.id === match.season_id)
      return {
        ...match,
        seasons: season || null
      }
    })

    return { code: 200, msg: 'success', data: matchesWithSeasons || [] }
  }

  @Get('recent')
  async getRecentMatches(@Query('limit') limit: string = '5', @Query('seasonId') seasonId?: string) {
    const client = getSupabaseClient()

    // 构建查询
    let query = client
      .from('matches')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    // 如果指定了赛季ID，按赛季筛选
    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    // 获取最近战绩
    const { data: matches, error } = await query

    if (error) {
      console.error('获取最近战绩失败:', error)
      return { code: 500, msg: '获取最近战绩失败', data: null }
    }

    // 获取所有赛季信息
    const { data: seasons } = await client
      .from('seasons')
      .select('*')

    // 在代码中关联数据
    const matchesWithSeasons = (matches || []).map(match => {
      const season = seasons?.find(s => s.id === match.season_id)
      return {
        ...match,
        seasons: season || null
      }
    })

    return { code: 200, msg: 'success', data: matchesWithSeasons || [] }
  }

  @Get(':id')
  async getMatchById(@Param('id') id: string) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('获取战绩详情失败:', error)
      return { code: 500, msg: '获取战绩详情失败', data: null }
    }

    return { code: 200, msg: 'success', data: data || null }
  }

  @Post()
  async createMatch(@Body() body: any) {
    const client = getSupabaseClient()
    
    // 构建插入数据
    const insertData: any = {
      season_id: body.seasonId,
      team1_player1_id: body.team1Player1Id,
      team1_player2_id: body.team1Player2Id,
      team2_player1_id: body.team2Player1Id,
      team2_player2_id: body.team2Player2Id,
      winner_team: body.winnerTeam,
      score: body.score,
      remark: body.remark,
      is_deleted: false
    }
    
    // 如果提供了时间，使用提供的时间
    if (body.matchTime) {
      insertData.created_at = new Date(body.matchTime).toISOString()
    }
    
    const { data, error } = await client
      .from('matches')
      .insert(insertData)
      .select()

    if (error) {
      console.error('创建战绩失败:', error)
      return { code: 500, msg: '创建战绩失败', data: null }
    }

    // 更新玩家统计数据
    await this.updatePlayerStats(body.seasonId)

    return { code: 200, msg: 'success', data: data?.[0] || null }
  }

  @Post('clear-all')
  async clearAllData() {
    const client = getSupabaseClient()

    try {
      // 清空战绩表
      await client.from('matches').delete().neq('id', 0)
      // 清空赛季表
      await client.from('seasons').delete().neq('id', 0)
      // 清空玩家统计表
      await client.from('player_stats').delete().neq('id', 0)

      return { code: 200, msg: '所有数据已清空', data: null }
    } catch (error) {
      console.error('清空数据失败:', error)
      return { code: 500, msg: '清空数据失败', data: null }
    }
  }

  @Put(':id')
  async updateMatch(@Param('id') id: string, @Body() body: any) {
    const client = getSupabaseClient()

    // 获取原始数据
    const { data: oldData } = await client
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (!oldData) {
      return { code: 404, msg: '战绩不存在', data: null }
    }

    // 记录编辑历史
    const editHistory = oldData.edit_history || []
    editHistory.push({
      timestamp: new Date().toISOString(),
      action: '修改战绩',
      operator: 'system',
      details: {
        old: { score: oldData.score, remark: oldData.remark },
        new: { score: body.score, remark: body.remark }
      }
    })

    // 构建更新数据
    const updateData: any = {
      winner_team: body.winnerTeam !== undefined ? body.winnerTeam : oldData.winner_team,
      score: body.score,
      remark: body.remark,
      edit_history: editHistory,
      updated_at: new Date().toISOString()
    }
    
    // 如果提供了时间，更新创建时间
    if (body.matchTime) {
      updateData.created_at = new Date(body.matchTime).toISOString()
    }

    // 更新战绩
    const { data, error } = await client
      .from('matches')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新战绩失败:', error)
      return { code: 500, msg: '更新战绩失败', data: null }
    }

    // 更新玩家统计数据
    await this.updatePlayerStats(oldData.season_id)

    return { code: 200, msg: 'success', data: data?.[0] || null }
  }

  @Delete(':id')
  async deleteMatch(@Param('id') id: string) {
    const client = getSupabaseClient()

    // 获取战绩信息
    const { data: matchData } = await client
      .from('matches')
      .select('season_id')
      .eq('id', id)
      .single()

    if (!matchData) {
      return { code: 404, msg: '战绩不存在', data: null }
    }

    // 软删除
    const { data, error } = await client
      .from('matches')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('删除战绩失败:', error)
      return { code: 500, msg: '删除战绩失败', data: null }
    }

    // 更新玩家统计数据
    await this.updatePlayerStats(matchData.season_id)

    return { code: 200, msg: 'success', data: data?.[0] || null }
  }

  // 更新玩家统计数据
  private async updatePlayerStats(seasonId: string) {
    const client = getSupabaseClient()

    // 获取该赛季所有未删除的战绩
    const { data: matches } = await client
      .from('matches')
      .select('*')
      .eq('season_id', seasonId)
      .eq('is_deleted', false)

    if (!matches || matches.length === 0) return

    // 获取所有玩家
    const { data: players } = await client
      .from('players')
      .select('*')

    if (!players) return

    // 计算每个玩家的统计数据
    const playerStats = players.map((player) => {
      const participatedMatches = matches.filter(
        (m) =>
          m.team1_player1_id === player.id ||
          m.team1_player2_id === player.id ||
          m.team2_player1_id === player.id ||
          m.team2_player2_id === player.id
      )

      const wins = participatedMatches.filter((m) => {
        if (m.team1_player1_id === player.id || m.team1_player2_id === player.id) {
          return m.winner_team === 1
        } else {
          return m.winner_team === 2
        }
      }).length

      const winRate = participatedMatches.length > 0
        ? ((wins / participatedMatches.length) * 100).toFixed(2)
        : '0.00'

      return {
        player_id: player.id,
        player_name: player.name,
        total_matches: participatedMatches.length,
        wins,
        win_rate: winRate
      }
    })

    // 更新或插入玩家统计数据
    for (const stat of playerStats) {
      const { data: existing } = await client
        .from('player_stats')
        .select('*')
        .eq('season_id', seasonId)
        .eq('player_id', stat.player_id)
        .single()

      if (existing) {
        await client
          .from('player_stats')
          .update({
            total_matches: stat.total_matches,
            wins: stat.wins,
            win_rate: stat.win_rate,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        await client.from('player_stats').insert({
          season_id: seasonId,
          player_id: stat.player_id,
          total_matches: stat.total_matches,
          wins: stat.wins,
          win_rate: stat.win_rate
        })
      }
    }
  }
}

@Controller()
export class MatchesControllerService {
  constructor(private readonly matchesService: MatchesService) {}
}
