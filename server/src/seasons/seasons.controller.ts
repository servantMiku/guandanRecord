import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common'
import { SeasonsService } from './seasons.service'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get()
  async getAllSeasons() {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取赛季列表失败:', error)
      return { code: 500, msg: '获取赛季列表失败', data: null }
    }

    return { code: 200, msg: 'success', data: data || [] }
  }

  @Get('active')
  async getActiveSeason() {
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

    return { code: 200, msg: 'success', data: data || [] }
  }

  @Post()
  async createSeason(@Body() body: { name: string; startDate: string }) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('seasons')
      .insert({
        name: body.name,
        start_date: body.startDate,
        status: 'active'
      })
      .select()

    if (error) {
      console.error('创建赛季失败:', error)
      return { code: 500, msg: '创建赛季失败', data: null }
    }

    return { code: 200, msg: 'success', data: data?.[0] || null }
  }

  @Put(':id/end')
  async endSeason(@Param('id') id: string, @Body() body: { endDate: string }) {
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

    return { code: 200, msg: 'success', data: data?.[0] || null }
  }
}

@Controller()
export class SeasonsControllerService {
  constructor(private readonly seasonsService: SeasonsService) {}
}
