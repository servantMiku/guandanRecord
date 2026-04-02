import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common'
import { SeasonsService } from './seasons.service'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

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
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))

    return { code: 200, msg: 'success', data: seasons }
  }

  @Post()
  async createSeason(@Body() body: { name: string; startDate: string; endDate?: string | null }) {
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
      status: season.status,
      createdAt: season.created_at,
      updatedAt: season.updated_at
    } : null

    return { code: 200, msg: 'success', data: result }
  }

  @Put(':id/end')
  async endSeason(@Param('id') id: string, @Body() body: { endDate: string }) {
    console.log('结束赛季请求 - ID:', id, '结束日期:', body.endDate)
    const client = getSupabaseClient()
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
      status: season.status,
      createdAt: season.created_at,
      updatedAt: season.updated_at
    } : null

    return { code: 200, msg: 'success', data: result }
  }
}

@Controller()
export class SeasonsControllerService {
  constructor(private readonly seasonsService: SeasonsService) {}
}
