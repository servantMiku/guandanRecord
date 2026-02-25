import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

const tabs = [
  { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
  { pagePath: '/pages/records/index', text: '战绩', icon: '🏆' },
  { pagePath: '/pages/stats/index', text: '统计', icon: '📊' },
  { pagePath: '/pages/profile/index', text: '我的', icon: '👤' }
]

export default function CustomTabBar() {
  const currentPath = `/${Taro.getCurrentPages()[0]?.route || 'pages/index/index'}`

  const switchTab = (path: string) => {
    Taro.switchTab({ url: path })
  }

  return (
    <View className="tab-bar">
      <View className="tab-bar-border"></View>
      {tabs.map((item) => {
        const isActive = currentPath === item.pagePath
        return (
          <View
            key={item.pagePath}
            className="tab-bar-item"
            onClick={() => switchTab(item.pagePath)}
          >
            <Text className={`tab-bar-icon ${isActive ? 'active' : ''}`}>{item.icon}</Text>
            <Text className={`tab-bar-text ${isActive ? 'active' : ''}`}>{item.text}</Text>
          </View>
        )
      })}
    </View>
  )
}
