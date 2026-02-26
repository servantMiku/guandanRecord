import Taro from '@tarojs/taro'

/**
 * 微信小程序调试工具
 * 在开发版/体验版自动开启调试模式
 * 如需开启调试，取消下方注释
 */
export function enableWxDebugIfNeeded() {
  // 仅在微信小程序环境执行
  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    try {
      const accountInfo = Taro.getAccountInfoSync()
      const envVersion = accountInfo.miniProgram.envVersion
      console.log('[Debug] envVersion:', envVersion)

      // 开发版/体验版自动开启调试（已禁用，如需调试请取消注释）
      // if (envVersion !== 'release') {
      //   Taro.setEnableDebug({ enableDebug: true })
      // }
    } catch (error) {
      console.error('[Debug] 开启调试模式失败:', error)
    }
  }
}
