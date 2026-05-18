import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '../storage/database/supabase-client'

export type LogAction = 'create' | 'update' | 'delete' | 'import' | 'export' | 'clear' | 'end' | 'config'
export type LogTarget = 'match' | 'player' | 'season' | 'config' | 'data'

export interface LogEntry {
  user_id?: string | null
  user_name?: string | null
  action: LogAction
  target_type: LogTarget
  target_id?: string | null
  details?: Record<string, any> | null
}

@Injectable()
export class OperationLogService {
  async log(entry: LogEntry) {
    const client = getSupabaseClient()
    const { error } = await client.from('operation_logs').insert({
      user_id: entry.user_id || null,
      user_name: entry.user_name || null,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id || null,
      details: entry.details || null,
    })
    if (error) {
      console.error('写入操作日志失败:', error)
    }
  }
}
