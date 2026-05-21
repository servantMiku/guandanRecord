import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { SeasonsService } from './seasons.service'
import { getSupabaseClient } from '../storage/database/supabase-client'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { OperationLogService } from '../operation-log/operation-log.service'

@Controller('seasons')
export class SeasonsController {
  constructor(
    private readonly seasonsService: SeasonsService,
    private readonly logService: OperationLogService,
  ) {}

  @Get()
  async getAllSeasons() {
    console.log('获取赛季列表请求')
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取赛季列表失败:', error)
      return { code: 500, msg: '获取赛季列表失败', data: null }
    }

    console.log('获取赛季列表成功，数量:', data?.length || 0)

    // 转换字段名为 camelCase
    const seasons = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      startDate: s.start_date,
      endDate: s.end_date,
      totalMatches: s.total_matches,
      currentMatches: s.current_matches,
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))

    return { code: 200, msg: 'success', data: seasons }
  }

  @Get('active')
  async getActiveSeason() {
    console.log('获取活跃赛季请求')
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('获取活跃赛季失败:', error)
      return { code: 500, msg: '获取活跃赛季失败', data: null }
    }

    console.log('获取活跃赛季成功:', data?.[0]?.name || '无活跃赛季')

    // 转换字段名为 camelCase
    const seasons = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      startDate: s.start_date,
      endDate: s.end_date,
      totalMatches: s.total_matches,
      currentMatches: s.current_matches,
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))

    return { code: 200, msg: 'success', data: seasons }
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async createSeason(@Body() body: { name: string; startDate: string; endDate?: string | null; totalMatches?: number }, @CurrentUser() user: any) {
    console.log('创建赛季请求:', body)
    const client = getSupabaseClient()

    const insertData: any = {
      name: body.name,
      start_date: body.startDate,
      status: 'active'
    }

    if (body.endDate) {
      insertData.end_date = body.endDate
    }

    if (body.totalMatches && body.totalMatches > 0) {
      insertData.total_matches = body.totalMatches
    }

    console.log('插入数据:', insertData)

    const { data, error } = await client
      .from('seasons')
      .insert(insertData)
      .select('*')

    if (error) {
      console.error('创建赛季失败:', error)
      return { code: 500, msg: '创建赛季失败: ' + error.message, data: null }
    }

    console.log('插入结果:', data)

    // 转换字段名为 camelCase
    const season = data?.[0]
    const result = season ? {
      id: season.id,
      name: season.name,
      startDate: season.start_date,
      endDate: season.end_date,
      totalMatches: season.total_matches,
      currentMatches: season.current_matches,
      status: season.status,
      createdAt: season.created_at,
      updatedAt: season.updated_at
    } : null

    // 记录操作日志
    if (result) {
      this.logService.log({
        action: 'create',
        target_type: 'season',
        target_id: result.id,
        user_id: user?.userId,
        details: { name: body.name, startDate: body.startDate },
      })
    }

    return { code: 200, msg: 'success', data: result }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async updateSeason(@Param('id') id: string, @Body() body: { name?: string; startDate?: string; endDate?: string | null; totalMatches?: number }, @CurrentUser() user: any) {
    console.log('更新赛季请求 - ID:', id, body)
    const client = getSupabaseClient()

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.startDate !== undefined) updateData.start_date = body.startDate
    if (body.endDate !== undefined) updateData.end_date = body.endDate
    if (body.totalMatches !== undefined) updateData.total_matches = body.totalMatches

    const { data, error } = await client
      .from('seasons')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新赛季失败:', error)
      return { code: 500, msg: '更新赛季失败: ' + error.message, data: null }
    }

    console.log('赛季更新成功:', data?.[0]?.name)

    const season = data?.[0]
    const result = season ? {
      id: season.id,
      name: season.name,
      startDate: season.start_date,
      endDate: season.end_date,
      totalMatches: season.total_matches,
      currentMatches: season.current_matches,
      status: season.status,
      createdAt: season.created_at,
      updatedAt: season.updated_at
    } : null

    // 记录操作日志
    if (result) {
      this.logService.log({
        action: 'update',
        target_type: 'season',
        target_id: id,
        user_id: user?.userId,
        details: { name: body.name },
      })
    }

    return { code: 200, msg: 'success', data: result }
  }

  @Put(':id/end')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async endSeason(@Param('id') id: string, @Body() body: { endDate: string }, @CurrentUser() user: any) {
    console.log('结束赛季请求 - ID:', id, '结束日期:', body.endDate)
    const client = getSupabaseClient()

    // 先清空该赛季的历史数据（软删除）
    try {
      console.log('开始清空赛季', id, '的历史数据')
      const { error: matchesError } = await client
        .from('matches')
        .update({ deleted_at: new Date().toISOString() })
        .eq('season_id', id)
        .is('deleted_at', null)

      if (matchesError) {
        console.error('清空赛季战绩失败:', matchesError)
        return { code: 500, msg: '清空赛季战绩失败', data: null }
      }

      const { error: statsError } = await client
        .from('player_stats')
        .update({ deleted_at: new Date().toISOString() })
        .eq('season_id', id)
        .is('deleted_at', null)

      if (statsError) {
        console.error('清空赛季统计数据失败:', statsError)
        return { code: 500, msg: '清空赛季统计数据失败', data: null }
      }

      console.log('赛季', id, '的历史数据已清空')
    } catch (err) {
      console.error('清空赛季数据时出错:', err)
      return { code: 500, msg: '清空赛季数据时出错', data: null }
    }

    const { data, error } = await client
      .from('seasons')
      .update({
        end_date: body.endDate,
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('结束赛季失败:', error)
      return { code: 500, msg: '结束赛季失败', data: null }
    }

    console.log('赛季结束成功:', data?.[0]?.name)

    // 转换字段名为 camelCase
    const season = data?.[0]
    const result = season ? {
      id: season.id,
      name: season.name,
      startDate: season.start_date,
      endDate: season.end_date,
      totalMatches: season.total_matches,
      currentMatches: season.current_matches,
      status: season.status,
      createdAt: season.created_at,
      updatedAt: season.updated_at
    } : null

    // 记录操作日志
    if (result) {
      this.logService.log({
        action: 'end',
        target_type: 'season',
        target_id: id,
        user_id: user?.userId,
        details: { name: result.name, endDate: body.endDate },
      })
    }

    return { code: 200, msg: 'success', data: result }
  }
}

@Controller()
export class SeasonsControllerService {
  constructor(private readonly seasonsService: SeasonsService) {}
}
