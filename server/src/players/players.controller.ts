import { Controller, Get, Put, Param, Body } from '@nestjs/common'
import { PlayersService } from './players.service'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async getAllPlayers() {
    const client = getSupabaseClient()

    // 先检查是否有玩家数据
    const { data: existingPlayers, error: checkError } = await client
      .from('players')
      .select('*')
      .order('created_at', { ascending: true })

    if (checkError) {
      console.error('获取玩家列表失败:', checkError)
      return { code: 500, msg: '获取玩家列表失败', data: null }
    }

    // 如果没有玩家数据，初始化6个默认玩家
    if (!existingPlayers || existingPlayers.length === 0) {
      console.log('初始化6个默认玩家')
      const defaultPlayers = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, index) => ({
        name: `玩家${name}`,
        avatar: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data: insertedPlayers, error: insertError } = await client
        .from('players')
        .insert(defaultPlayers)
        .select('*')

      if (insertError) {
        console.error('初始化玩家失败:', insertError)
        return { code: 500, msg: '初始化玩家失败', data: null }
      }

      console.log('玩家初始化成功:', insertedPlayers)
      return { code: 200, msg: 'success', data: insertedPlayers || [] }
    }

    return { code: 200, msg: 'success', data: existingPlayers || [] }
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
