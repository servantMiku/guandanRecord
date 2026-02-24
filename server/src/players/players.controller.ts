import { Controller, Get, Put, Param, Body } from '@nestjs/common'
import { PlayersService } from './players.service'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async getAllPlayers() {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('players')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('获取玩家列表失败:', error)
      return { code: 500, msg: '获取玩家列表失败', data: null }
    }

    return { code: 200, msg: 'success', data: data || [] }
  }

  @Put(':id')
  async updatePlayer(@Param('id') id: string, @Body() body: { name?: string; avatar?: string }) {
    const client = getSupabaseClient()

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.avatar !== undefined) {
      updateData.avatar = body.avatar
    }

    const { data, error } = await client
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新玩家失败:', error)
      return { code: 500, msg: '更新玩家失败', data: null }
    }

    return { code: 200, msg: 'success', data: data?.[0] || null }
  }
}

@Controller()
export class PlayersControllerService {
  constructor(private readonly playersService: PlayersService) {}
}
