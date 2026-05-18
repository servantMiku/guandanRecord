import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { RolesGuard } from './guards/roles.guard'
import { Roles } from './decorators/roles.decorator'
import { CurrentUser } from './decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 微信小程序登录：POST /api/auth/login { code }
  @Post('login')
  async login(@Body() body: { code: string }) {
    if (!body.code) {
      return { code: 400, msg: '缺少登录凭证 code', data: null }
    }
    try {
      const result = await this.authService.loginByWechat(body.code)
      return { code: 200, msg: 'success', data: result }
    } catch (error: any) {
      return { code: 401, msg: error.message || '登录失败', data: null }
    }
  }

  // H5 端备用登录：POST /api/auth/login/password { password }
  @Post('login/password')
  async loginByPassword(@Body() body: { password: string }) {
    if (!body.password) {
      return { code: 400, msg: '缺少密码', data: null }
    }
    try {
      const result = await this.authService.loginByPassword(body.password)
      return { code: 200, msg: 'success', data: result }
    } catch (error: any) {
      return { code: 401, msg: error.message || '登录失败', data: null }
    }
  }

  // 获取当前用户信息：GET /api/auth/me
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@CurrentUser() user: any) {
    try {
      const profile = await this.authService.getProfile(user.userId)
      return { code: 200, msg: 'success', data: profile }
    } catch (error: any) {
      return { code: 401, msg: error.message || '获取用户信息失败', data: null }
    }
  }
}
