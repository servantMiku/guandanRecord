import Taro from '@tarojs/taro'
import { Network } from '@/network'

export type UserRole = 'user' | 'admin'

export type UserInfo = {
  id: string
  nickname?: string
  avatarUrl?: string
  role: UserRole
}

type AuthState = {
  token: string | null
  user: UserInfo | null
  initialized: boolean
}

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

// 从 storage 恢复状态
const loadState = (): AuthState => {
  try {
    const token = Taro.getStorageSync(TOKEN_KEY) || null
    const userStr = Taro.getStorageSync(USER_KEY) || null
    const user = userStr ? JSON.parse(userStr) : null
    return { token, user, initialized: false }
  } catch {
    return { token: null, user: null, initialized: false }
  }
}

const saveToken = (token: string | null) => {
  if (token) {
    Taro.setStorageSync(TOKEN_KEY, token)
  } else {
    Taro.removeStorageSync(TOKEN_KEY)
  }
}

const saveUser = (user: UserInfo | null) => {
  if (user) {
    Taro.setStorageSync(USER_KEY, JSON.stringify(user))
  } else {
    Taro.removeStorageSync(USER_KEY)
  }
}

// WeChat 小程序自动登录
export const loginWithWechat = async (): Promise<{ token: string; user: UserInfo } | null> => {
  try {
    // 获取微信登录凭证
    const loginRes = await Taro.login()
    if (!loginRes.code) {
      console.error('微信登录失败: 未获取到 code')
      return null
    }

    // 发送 code 到后端
    const res = await Network.request({
      url: '/api/auth/login',
      method: 'POST',
      data: { code: loginRes.code },
    })

    if (res.data?.code === 200 && res.data?.data) {
      const { token, user } = res.data.data
      saveToken(token)
      saveUser(user)
      return { token, user }
    }

    console.error('登录认证失败:', res.data?.msg)
    return null
  } catch (error) {
    console.error('登录请求失败:', error)
    return null
  }
}

// H5 密码登录
export const loginWithPassword = async (password: string): Promise<{ token: string; user: UserInfo } | null> => {
  try {
    const res = await Network.request({
      url: '/api/auth/login/password',
      method: 'POST',
      data: { password },
    })

    if (res.data?.code === 200 && res.data?.data) {
      const { token, user } = res.data.data
      saveToken(token)
      saveUser(user)
      return { token, user }
    }

    return null
  } catch (error) {
    console.error('密码登录失败:', error)
    return null
  }
}

export const logout = () => {
  saveToken(null)
  saveUser(null)
}

export const getToken = (): string | null => {
  return loadState().token
}

export const getStoredUser = (): UserInfo | null => {
  return loadState().user
}

// Init auth — call this on app launch
export const initAuth = async (): Promise<void> => {
  const state = loadState()

  // 已有 token，尝试获取用户信息确认 token 是否有效
  if (state.token) {
    try {
      const res = await Network.request({
        url: '/api/auth/me',
        header: { Authorization: `Bearer ${state.token}` },
      })
      if (res.data?.code === 200 && res.data?.data) {
        const profile = res.data.data
        const user: UserInfo = {
          id: profile.id,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          role: profile.role,
        }
        saveUser(user)
        return
      }
    } catch {
      // token 失效，重新登录
    }
  }

  // 无有效 token，尝试微信自动登录
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  if (isWeapp) {
    await loginWithWechat()
  }
}
