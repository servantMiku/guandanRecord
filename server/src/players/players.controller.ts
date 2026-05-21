import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PlayersService } from './players.service'
import { getSupabaseClient } from '../storage/database/supabase-client'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { OperationLogService } from '../operation-log/operation-log.service'

@Controller('players')
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly logService: OperationLogService,
  ) {}

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
        user_id: null,
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

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async createPlayer(@Body() body: { name: string; avatar?: string }, @CurrentUser() user: any) {
    console.log('创建玩家请求 - 数据:', body)
    const client = getSupabaseClient()

    if (!body.name || !body.name.trim()) {
      return { code: 400, msg: '玩家名称不能为空', data: null }
    }

    const newPlayer = {
      name: body.name.trim(),
      avatar: body.avatar || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await client
      .from('players')
      .insert(newPlayer)
      .select()

    if (error) {
      console.error('创建玩家失败:', error)
      return { code: 500, msg: '创建玩家失败', data: null }
    }

    console.log('玩家创建成功:', data?.[0])
    if (data?.[0]) {
      this.logService.log({
        action: 'create',
        target_type: 'player',
        target_id: data[0].id,
        user_id: user?.userId,
        details: { name: body.name },
      })
    }
    return { code: 200, msg: 'success', data: data?.[0] || null }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async updatePlayer(@Param('id') id: string, @Body() body: { name?: string; avatar?: string }, @CurrentUser() user: any) {
    console.log('更新玩家请求 - ID:', id, '数据:', body)
    const client = getSupabaseClient()

    // 先查询玩家，检查权限
    const { data: existingPlayer, error: fetchError } = await client
      .from('players')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingPlayer) {
      console.error('玩家不存在:', fetchError)
      return { code: 404, msg: '玩家不存在', data: null }
    }

    // 权限检查：admin 或绑定的用户本人
    const isAdmin = user?.role === 'admin'
    const isOwner = existingPlayer.user_id === user?.userId
    if (!isAdmin && !isOwner) {
      return { code: 403, msg: '无权限修改此玩家', data: null }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.avatar !== undefined) {
      updateData.avatar = body.avatar
    }

    console.log('准备更新玩家数据:', updateData)

    const { data, error } = await client
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新玩家失败:', error)
      return { code: 500, msg: '更新玩家失败', data: null }
    }

    console.log('玩家更新成功:', data?.[0])
    if (data?.[0]) {
      this.logService.log({
        action: 'update',
        target_type: 'player',
        target_id: id,
        user_id: user?.userId,
        details: { name: body.name },
      })
    }
    return { code: 200, msg: 'success', data: data?.[0] || null }
  }

  @Post(':id/bind')
  @UseGuards(AuthGuard('jwt'))
  async bindPlayer(@Param('id') id: string, @Body() body: { avatar?: string } = {}, @CurrentUser() user: any) {
    const client = getSupabaseClient()

    // 1. 检查玩家是否存在
    const { data: player, error: playerError } = await client
      .from('players')
      .select('id, user_id, name')
      .eq('id', id)
      .single()

    if (playerError || !player) {
      return { code: 404, msg: '玩家不存在', data: null }
    }

    // 2. 检查玩家是否已被其他用户绑定
    if (player.user_id && player.user_id !== user.userId) {
      return { code: 400, msg: '该玩家已被其他用户绑定', data: null }
    }

    // 3. 已绑定给自己 → 可选更新头像，直接返回
    if (player.user_id === user.userId) {
      if (body.avatar) {
        await client.from('players').update({
          avatar: body.avatar,
          updated_at: new Date().toISOString(),
        }).eq('id', id)
      }
      return { code: 200, msg: '已绑定', data: { id: player.id, name: player.name } }
    }

    // 4. 清除该用户的旧绑定（换绑）
    const { error: clearError } = await client
      .from('players')
      .update({ user_id: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.userId)

    if (clearError) {
      console.error('清除旧绑定失败:', clearError)
    }

    // 5. 设置新绑定
    const updateData: any = {
      user_id: user.userId,
      updated_at: new Date().toISOString(),
    }
    if (body.avatar) {
      updateData.avatar = body.avatar
    }

    const { data: updatedPlayer, error: updateError } = await client
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('绑定玩家失败:', updateError)
      return { code: 500, msg: '绑定玩家失败', data: null }
    }

    this.logService.log({
      action: 'update',
      target_type: 'player',
      target_id: id,
      user_id: user.userId,
      details: { action: 'bind' },
    })

    return { code: 200, msg: '绑定成功', data: updatedPlayer?.[0] || null }
  }

  @Post(':id/unbind')
  @UseGuards(AuthGuard('jwt'))
  async unbindPlayer(@Param('id') id: string, @CurrentUser() user: any) {
    const client = getSupabaseClient()

    const { data: player, error: playerError } = await client
      .from('players')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (playerError || !player) {
      return { code: 404, msg: '玩家不存在', data: null }
    }

    if (!player.user_id) {
      return { code: 400, msg: '该玩家未绑定用户', data: null }
    }

    // 权限：admin 或绑定的用户本人
    const isAdmin = user?.role === 'admin'
    const isOwner = player.user_id === user?.userId
    if (!isAdmin && !isOwner) {
      return { code: 403, msg: '无权限解绑', data: null }
    }

    const { error: updateError } = await client
      .from('players')
      .update({ user_id: null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('解绑玩家失败:', updateError)
      return { code: 500, msg: '解绑玩家失败', data: null }
    }

    this.logService.log({
      action: 'update',
      target_type: 'player',
      target_id: id,
      user_id: user.userId,
      details: { action: 'unbind' },
    })

    return { code: 200, msg: '解绑成功', data: null }
  }
}

@Controller()
export class PlayersControllerService {
  constructor(private readonly playersService: PlayersService) {}
}
