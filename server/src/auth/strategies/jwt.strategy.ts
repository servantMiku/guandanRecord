import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { getSupabaseClient } from '../../storage/database/supabase-client'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'guandan-dev-secret-key',
    })
  }

  async validate(payload: { userId: string; role: string; openid: string }) {
    // 验证用户仍在有效状态
    const client = getSupabaseClient()
    const { data: user } = await client
      .from('users')
      .select('id, role')
      .eq('id', payload.userId)
      .single()

    if (!user) {
      throw new UnauthorizedException('用户不存在或已删除')
    }

    return { userId: user.id, role: user.role }
  }
}
