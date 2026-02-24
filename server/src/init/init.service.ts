import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Injectable()
export class InitService {
  async initializeDefaultPlayers() {
    const client = getSupabaseClient()

    // 检查是否已有玩家数据
    const { data: existingPlayers } = await client
      .from('players')
      .select('*')
      .limit(1)

    if (existingPlayers && existingPlayers.length > 0) {
      console.log('玩家数据已存在，跳过初始化')
      return
    }

    // 初始化 6 位默认玩家
    const defaultPlayers = [
      { name: 'A' },
      { name: 'B' },
      { name: 'C' },
      { name: 'D' },
      { name: 'E' },
      { name: 'F' }
    ]

    const { data, error } = await client
      .from('players')
      .insert(defaultPlayers)
      .select()

    if (error) {
      console.error('初始化默认玩家失败:', error)
    } else {
      console.log('默认玩家初始化成功:', data)
    }
  }
}
