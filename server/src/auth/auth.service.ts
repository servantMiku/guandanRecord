import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async loginByWechat(code: string) {
    const appid = process.env.WECHAT_APPID
    const secret = process.env.WECHAT_APP_SECRET

    if (!appid || !secret) {
      throw new UnauthorizedException('微信登录未配置')
    }

    // 调微信 API 换 openid
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    const res = await fetch(url)
    const data = await res.json()

    if (data.errcode) {
      console.error('微信登录失败:', data)
      throw new UnauthorizedException('微信登录验证失败')
    }

    const { openid, session_key } = data

    // 查或建用户
    const client = getSupabaseClient()
    const { data: existing } = await client
      .from('users')
      .select('*')
      .eq('openid', openid)
      .single()

    let user = existing
    if (!user) {
      const { data: newUser } = await client
        .from('users')
        .insert({
          openid,
          role: 'user',
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single()
      user = newUser as any
    } else {
      await client
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    if (!user) {
      throw new UnauthorizedException('用户创建失败')
    }

    // 签发 JWT
    const token = this.jwtService.sign({
      userId: user.id,
      role: user.role,
      openid: user.openid,
    })

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
    }
  }

  // H5 开发环境的管理员密码登录
  async loginByPassword(password: string) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    if (password !== adminPassword) {
      throw new UnauthorizedException('密码错误')
    }

    // H5 登陆用 mock 的 admin 用户
    const client = getSupabaseClient()
    const { data: adminUser } = await client
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (!adminUser) {
      throw new UnauthorizedException('管理员用户未初始化')
    }

    const token = this.jwtService.sign({
      userId: adminUser.id,
      role: adminUser.role,
      openid: adminUser.openid,
    })

    return {
      token,
      user: {
        id: adminUser.id,
        nickname: adminUser.nickname,
        avatarUrl: adminUser.avatar_url,
        role: adminUser.role,
      },
    }
  }

  async getProfile(userId: string) {
    const client = getSupabaseClient()
    const { data: user } = await client
      .from('users')
      .select('id, nickname, avatar_url, role, created_at')
      .eq('id', userId)
      .single()

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      role: user.role,
      createdAt: user.created_at,
    }
  }
}
