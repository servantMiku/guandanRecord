import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { MatchesService } from './matches.service'
import { getSupabaseClient } from '../storage/database/supabase-client'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { OperationLogService } from '../operation-log/operation-log.service'

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly logService: OperationLogService,
  ) {}

  @Get()
  async getAllMatches(@Query('limit') limit?: string, @Query('seasonId') seasonId?: string) {
    console.log('获取战绩列表请求 - 赛季ID:', seasonId, '限制:', limit)
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

    console.log('获取战绩列表成功，数量:', matches?.length || 0)

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
    console.log('获取最近战绩请求 - 赛季ID:', seasonId, '限制:', limit)
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

    console.log('获取最近战绩成功，数量:', matches?.length || 0)

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
    console.log('获取战绩详情请求 - ID:', id)
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

    console.log('获取战绩详情成功:', data?.id)
    return { code: 200, msg: 'success', data: data || null }
  }

  @Post()
  async createMatch(@Body() body: any) {
    console.log('创建战绩请求:', body)
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
    
    // 如果提供了时间，使用提供的时间（将本地时间转换为带时区的 ISO 格式）
    if (body.matchTime) {
      // 前端发送的格式是 YYYY-MM-DDTHH:mm，需要确保按本地时间解析
      // 通过添加秒和时区信息，确保正确转换为 UTC
      const localDateTime = body.matchTime + ':00+08:00' // 假设是北京时间
      insertData.created_at = new Date(localDateTime).toISOString()
    }
    
    console.log('准备插入战绩数据:', insertData)
    
    const { data, error } = await client
      .from('matches')
      .insert(insertData)
      .select()

    if (error) {
      console.error('创建战绩失败:', error)
      return { code: 500, msg: '创建战绩失败', data: null }
    }

    const createdMatch = data?.[0]
    if (!createdMatch) {
      console.error('战绩创建后未返回数据')
      return { code: 500, msg: '创建战绩失败', data: null }
    }

    console.log('战绩创建成功:', createdMatch)

    // 使用实际入库的 season_id（而非 body.seasonId），消除大小写/格式差异
    const actualSeasonId = createdMatch.season_id
    console.log('战绩所属赛季 season_id:', actualSeasonId, '(body.seasonId:', body.seasonId, ')')

    // 检查 body.seasonId 和实际入库的是否一致（用于排查问题）
    if (String(body.seasonId) !== String(actualSeasonId)) {
      console.error('严重：body.seasonId 与入库的 season_id 不一致!', body.seasonId, '->', actualSeasonId)
    }

    // 累加更新玩家统计数据（即使失败也不影响战绩创建）
    try {
      console.log('开始累加更新赛季', actualSeasonId, '的玩家统计数据')
      await this.updatePlayerStatsIncremental(actualSeasonId, createdMatch, true)
      console.log('玩家统计数据累加更新完成')
    } catch (statsError) {
      console.error('更新玩家统计数据失败，但战绩已创建:', statsError)
    }

    // 统计该赛季实际非删除战绩数，更新赛季并检查自动结束
    try {
      console.log('开始更新赛季', actualSeasonId, '的当前场次')
      const { data: matchIds, error: countError } = await client
        .from('matches')
        .select('id')
        .eq('season_id', actualSeasonId)
        .eq('is_deleted', false)

      console.log('count查询结果: matchIds=', matchIds, 'countError=', countError)

      if (countError) {
        console.error('统计战绩数失败:', countError)
      } else if (matchIds) {
        const actualMatchCount = matchIds.length
        console.log('赛季实际场次:', actualMatchCount)

        const seasonUpdateData: any = {
          current_matches: actualMatchCount,
          updated_at: new Date().toISOString()
        }

        // 查询赛季信息（含 total_matches 和当前 status）
        const { data: seasonForCheck } = await client
          .from('seasons')
          .select('total_matches, status')
          .eq('id', actualSeasonId)
          .single()

        console.log('赛季信息查询: seasonForCheck=', seasonForCheck)

        // 检查是否达到总场次
        if (seasonForCheck?.total_matches && actualMatchCount >= seasonForCheck.total_matches) {
          seasonUpdateData.end_date = new Date().toISOString()
          seasonUpdateData.status = 'ended'
          console.log('赛季达到总场次，自动结束赛季')
        }

        console.log('准备更新赛季数据:', seasonUpdateData)
        const { error: seasonUpdateError } = await client
          .from('seasons')
          .update(seasonUpdateData)
          .eq('id', actualSeasonId)

        if (seasonUpdateError) {
          console.error('更新赛季场次失败:', seasonUpdateError)
        } else {
          console.log('赛季场次更新成功:', actualMatchCount, '新状态:', seasonUpdateData.status || seasonForCheck?.status || 'active')
        }
      } else {
        console.error('matchIds 为 null/undefined，无法统计')
      }
    } catch (seasonError) {
      console.error('更新赛季场次时出错:', seasonError)
    }

    // 记录操作日志
    this.logService.log({
      action: 'create',
      target_type: 'match',
      target_id: createdMatch.id,
      details: { seasonId: actualSeasonId, score: body.score },
    })

    return { code: 200, msg: 'success', data: createdMatch }
  }

  @Post('clear-all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async clearAllData() {
    console.log('清空所有数据请求')
    const client = getSupabaseClient()

    try {
      console.log('开始清空战绩表...')
      // 清空战绩表
      await client.from('matches').delete().neq('id', 0)
      console.log('战绩表已清空')
      
      console.log('开始清空赛季表...')
      // 清空赛季表
      await client.from('seasons').delete().neq('id', 0)
      console.log('赛季表已清空')
      
      console.log('开始清空玩家统计表...')
      // 清空玩家统计表
      await client.from('player_stats').delete().neq('id', 0)
      console.log('玩家统计表已清空')

      console.log('所有数据已清空完成')
      this.logService.log({ action: 'clear', target_type: 'data' })
      return { code: 200, msg: '所有数据已清空', data: null }
    } catch (error) {
      console.error('清空数据失败:', error)
      return { code: 500, msg: '清空数据失败', data: null }
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async updateMatch(@Param('id') id: string, @Body() body: any) {
    console.log('更新战绩请求 - ID:', id, '数据:', body)
    const client = getSupabaseClient()

    // 获取原始数据
    const { data: oldData } = await client
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (!oldData) {
      console.log('战绩不存在 - ID:', id)
      return { code: 404, msg: '战绩不存在', data: null }
    }

    console.log('原始战绩数据:', oldData)

    // 先回退旧战绩的影响（即使失败也不影响更新）
    try {
      console.log('先回退旧战绩对统计的影响')
      await this.updatePlayerStatsIncremental(oldData.season_id, oldData, false)
    } catch (statsError) {
      console.error('回退旧战绩统计失败:', statsError)
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

    // 构建新数据（只更新 body 中提供的字段，未提供的保持原值）
    const newMatchData: any = {
      season_id: oldData.season_id,
      team1_player1_id: body.team1Player1Id !== undefined ? body.team1Player1Id : oldData.team1_player1_id,
      team1_player2_id: body.team1Player2Id !== undefined ? body.team1Player2Id : oldData.team1_player2_id,
      team2_player1_id: body.team2Player1Id !== undefined ? body.team2Player1Id : oldData.team2_player1_id,
      team2_player2_id: body.team2Player2Id !== undefined ? body.team2Player2Id : oldData.team2_player2_id,
      winner_team: body.winnerTeam !== undefined ? body.winnerTeam : oldData.winner_team,
      score: body.score !== undefined ? body.score : oldData.score,
      remark: body.remark !== undefined ? body.remark : oldData.remark,
      edit_history: editHistory,
      updated_at: new Date().toISOString()
    }

    // 如果提供了时间，更新创建时间（将本地时间转换为带时区的 ISO 格式）
    if (body.matchTime) {
      const localDateTime = body.matchTime + ':00+08:00' // 假设是北京时间
      newMatchData.created_at = new Date(localDateTime).toISOString()
    }

    console.log('准备更新战绩数据:', newMatchData)

    // 更新战绩
    const { data, error } = await client
      .from('matches')
      .update(newMatchData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新战绩失败:', error)
      // 更新失败时恢复旧战绩的统计数据
      try {
        await this.updatePlayerStatsIncremental(oldData.season_id, oldData, true)
      } catch (e) {
        console.error('恢复旧战绩统计失败:', e)
      }
      return { code: 500, msg: '更新战绩失败', data: null }
    }

    console.log('战绩更新成功:', data?.[0])

    // 应用新战绩的影响（即使失败也不影响战绩更新）
    try {
      console.log('应用新战绩对统计的影响')
      await this.updatePlayerStatsIncremental(oldData.season_id, newMatchData, true)
      console.log('玩家统计数据累加更新完成')
    } catch (statsError) {
      console.error('更新玩家统计数据失败，但战绩已更新:', statsError)
    }

    // 更新后重新统计赛季场次（确保一致）
    try {
      const { data: matchIds } = await client
        .from('matches')
        .select('id')
        .eq('season_id', oldData.season_id)
        .eq('is_deleted', false)

      if (matchIds) {
        const newCount = matchIds.length
        const seasonUpdateData: any = {
          current_matches: newCount,
          updated_at: new Date().toISOString()
        }

        // 检查是否达到总场次
        const { data: seasonForCheck } = await client
          .from('seasons')
          .select('total_matches')
          .eq('id', oldData.season_id)
          .single()

        if (seasonForCheck?.total_matches && newCount >= seasonForCheck.total_matches) {
          seasonUpdateData.status = 'ended'
          seasonUpdateData.end_date = new Date().toISOString()
          console.log('修改战绩：赛季达到总场次，自动结束')
        }

        await client.from('seasons').update(seasonUpdateData).eq('id', oldData.season_id)
        console.log('修改战绩后赛季场次已重新统计:', newCount)
      }
    } catch (recountError) {
      console.error('修改战绩后统计赛季场次失败:', recountError)
    }

    // 记录操作日志
    this.logService.log({
      action: 'update',
      target_type: 'match',
      target_id: id,
      details: { score: body.score, remark: body.remark },
    })

    return { code: 200, msg: 'success', data: data?.[0] || null }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async deleteMatch(@Param('id') id: string) {
    console.log('删除战绩请求 - ID:', id)
    const client = getSupabaseClient()

    // 获取完整战绩信息
    const { data: matchData } = await client
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (!matchData) {
      console.log('战绩不存在 - ID:', id)
      return { code: 404, msg: '战绩不存在', data: null }
    }

    console.log('战绩所属赛季:', matchData.season_id)

    // 先回退该战绩对统计的影响（即使失败也不影响删除）
    try {
      console.log('先回退该战绩对统计的影响')
      await this.updatePlayerStatsIncremental(matchData.season_id, matchData, false)
    } catch (statsError) {
      console.error('回退玩家统计数据失败，但战绩将被删除:', statsError)
    }

    // 软删除
    console.log('开始软删除战绩...')
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

    console.log('战绩删除成功:', data?.[0]?.id)

    // 回退赛季 current_matches（重新统计实际场次）
    try {
      const { data: matchIds, error: countError } = await client
        .from('matches')
        .select('id')
        .eq('season_id', matchData.season_id)
        .eq('is_deleted', false)

      if (!countError && matchIds) {
        await client
          .from('seasons')
          .update({ current_matches: matchIds.length, updated_at: new Date().toISOString() })
          .eq('id', matchData.season_id)
      }
    } catch (recountError) {
      console.error('回退赛季场次失败:', recountError)
    }

    // 记录操作日志
    this.logService.log({
      action: 'delete',
      target_type: 'match',
      target_id: id,
    })

    return { code: 200, msg: 'success', data: data?.[0] || null }
  }

  // 累加更新玩家统计数据（基于单场战绩）
  private async updatePlayerStatsIncremental(seasonId: string, matchData: any, isAdd: boolean) {
    const client = getSupabaseClient()

    try {
      // 获取该场战绩的所有参与者
      const playerIds = [
        matchData.team1_player1_id,
        matchData.team1_player2_id,
        matchData.team2_player1_id,
        matchData.team2_player2_id
      ].filter(Boolean)

      console.log('战绩参与者:', playerIds, '是否添加:', isAdd)

      // 遍历每个参与者
      for (const playerId of playerIds) {
        if (!playerId) continue

        try {
          console.log(`正在处理玩家: ${playerId}`)

          // 获取玩家名称（仅用于日志）
          const { data: player, error: playerError } = await client
            .from('players')
            .select('name')
            .eq('id', playerId)
            .single()

          if (playerError) {
            console.error(`获取玩家 ${playerId} 信息失败:`, playerError)
            continue
          }

          if (!player) {
            console.error(`玩家 ${playerId} 不存在`)
            continue
          }

          // 判断该玩家是否获胜
          const isWinner =
            (matchData.team1_player1_id === playerId || matchData.team1_player2_id === playerId)
              ? matchData.winner_team === 1
              : matchData.winner_team === 2

          console.log(`玩家 ${playerId} (${player.name}) 获胜:`, isWinner)

          // 使用 maybeSingle 避免因重复记录导致查询失败
          const { data: existing } = await client
            .from('player_stats')
            .select('*')
            .eq('season_id', seasonId)
            .eq('player_id', playerId)
            .maybeSingle()

          const delta = isAdd ? 1 : -1
          const winDelta = isWinner ? delta : 0

          if (existing) {
            // 更新现有统计
            const newTotalMatches = Math.max(0, (existing.total_matches || 0) + delta)
            const newWins = Math.max(0, (existing.wins || 0) + winDelta)
            const newWinRate = newTotalMatches > 0
              ? ((newWins / newTotalMatches) * 100).toFixed(2)
              : '0.00'

            console.log(`更新玩家 ${playerId} 统计:`, {
              total_matches: newTotalMatches,
              wins: newWins,
              win_rate: newWinRate
            })

            const { error: updateError } = await client
              .from('player_stats')
              .update({
                total_matches: newTotalMatches,
                wins: newWins,
                win_rate: newWinRate,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)

            if (updateError) {
              console.error(`更新玩家 ${playerId} 统计失败:`, updateError)
            }
          } else if (isAdd) {
            // 只在添加时才插入新记录
            console.log(`插入玩家 ${playerId} 统计:`, {
              total_matches: 1,
              wins: isWinner ? 1 : 0,
              win_rate: isWinner ? '100.00' : '0.00'
            })

            const { error: insertError } = await client.from('player_stats').insert({
              season_id: seasonId,
              player_id: playerId,
              total_matches: 1,
              wins: isWinner ? 1 : 0,
              win_rate: isWinner ? '100.00' : '0.00'
            })

            if (insertError) {
              console.error(`插入玩家 ${playerId} 统计失败:`, insertError)
            }
          }
        } catch (playerError) {
          console.error(`处理玩家 ${playerId} 时出错:`, playerError)
        }
      }
    } catch (error) {
      console.error('更新玩家统计数据时出错:', error)
      throw error
    }
  }

  // 全量更新玩家统计数据（保留作为备用，用于数据修复）
  private async updatePlayerStats(seasonId: string) {
    const client = getSupabaseClient()

    console.log('执行全量统计更新（备用方法）')

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
