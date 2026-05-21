import Taro from '@tarojs/taro'

/**
 * 网络请求模块
 * 封装 Taro.request、Taro.uploadFile、Taro.downloadFile，自动添加项目域名前缀
 * 如果请求的 url 以 http:// 或 https:// 开头，则不会添加域名前缀
 *
 * IMPORTANT: 项目已经全局注入 PROJECT_DOMAIN
 */
export namespace Network {
    const createUrl = (url: string): string => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
        }
        return `${PROJECT_DOMAIN}${url}`
    }

    const getAuthHeaders = (): Record<string, string> => {
        try {
            const token = Taro.getStorageSync('auth_token')
            if (token) {
                return { Authorization: `Bearer ${token}` }
            }
        } catch {
            // storage not available
        }
        return {}
    }

    export const request: typeof Taro.request = option => {
        const headers = { ...getAuthHeaders(), ...option.header }
        return Taro.request({
            ...option,
            url: createUrl(option.url),
            header: headers,
        })
    }

    export const uploadFile: typeof Taro.uploadFile = option => {
        const headers = { ...getAuthHeaders(), ...option.header }
        return Taro.uploadFile({
            ...option,
            url: createUrl(option.url),
            header: headers,
        })
    }

    export const downloadFile: typeof Taro.downloadFile = option => {
        return Taro.downloadFile({
            ...option,
            url: createUrl(option.url),
        })
    }
}
