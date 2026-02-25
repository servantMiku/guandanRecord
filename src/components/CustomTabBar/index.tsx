import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'

const tabs = [
  { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
  { pagePath: '/pages/records/index', text: '战绩', icon: '🏆' },
  { pagePath: '/pages/stats/index', text: '统计', icon: '📊' },
  { pagePath: '/pages/profile/index', text: '我的', icon: '👤' }
]

export default function CustomTabBar() {
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 0) {
      setCurrentPath('/' + pages[pages.length - 1].route)
    }
  }, [])

  const switchTab = (path: string) => {
    Taro.switchTab({ url: path })
  }

  return (
    <View
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80px',
        backgroundColor: '#1e293b',
        display: 'flex',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        zIndex: 1000
      }}
    >
      {tabs.map((tab) => {
        const isActive = currentPath === tab.pagePath
        return (
          <View
            key={tab.pagePath}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px'
            }}
            onClick={() => switchTab(tab.pagePath)}
          >
            <Text
              style={{
                fontSize: '28px',
                marginBottom: '4px'
              }}
            >
              {tab.icon}
            </Text>
            <Text
              style={{
                fontSize: '16px',
                color: isActive ? '#f59e0b' : '#a8a29e',
                fontWeight: isActive ? 'bold' : 'normal'
              }}
            >
              {tab.text}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
