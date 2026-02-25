import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Trophy, Calendar, Users, TrendingUp, Plus } from 'lucide-react'
import './index.css'

type Season = {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: string
}

type Match = {
  id: string
  seasonId: string
  team1Player1Id: string
  team1Player2Id: string
  team2Player1Id: string
  team2Player2Id: string
  winnerTeam: number
  score: string
  remark: string | null
  createdAt: string
  seasons?: Season
}

export default function IndexPage() {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      // 获取当前活跃赛季
      const res = await Network.request({
        url: '/api/seasons/active'
      })
      if (res.data && res.data.data && res.data.data.length > 0) {
        setCurrentSeason(res.data.data[0])
      }

      // 获取最近战绩
      const matchRes = await Network.request({
        url: '/api/matches/recent'
      })
      if (matchRes.data && matchRes.data.data) {
        setRecentMatches(matchRes.data.data)
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const navigateTo = (url: string) => {
    Taro.navigateTo({ url })
  }

  const switchTab = (url: string) => {
    Taro.switchTab({ url })
  }

  const handleAddRecord = () => {
    if (!currentSeason) {
      Taro.showModal({
        title: '没有活跃赛季',
        content: '请先前往"赛季"页面创建一个赛季',
        confirmText: '去创建',
        success: (res) => {
          if (res.confirm) {
            Taro.switchTab({ url: '/pages/seasons/index' })
          }
        }
      })
      return
    }
    navigateTo(`/pages/record-form/index?seasonId=${currentSeason.id}`)
  }

  return (
    <View className="index-page">
      {/* 头部 - 当前赛季 */}
      <View className="header">
        <Text className="header-title">掼蛋战绩</Text>
        {currentSeason ? (
          <View>
            <Text className="header-season-name">{currentSeason.name}</Text>
            <Text className="header-date">
              {currentSeason.startDate} - {currentSeason.endDate || '进行中'}
            </Text>
          </View>
        ) : (
          <Text className="header-date">暂无活跃赛季</Text>
        )}
      </View>

      <View className="content">
        {/* 快捷操作 */}
        <View className="quick-actions">
          <View className="quick-btn quick-btn-add" onClick={handleAddRecord}>
            <Plus size={24} color="#ffffff" />
            <Text className="quick-btn-text">录入战绩</Text>
          </View>
          <View
            className="quick-btn quick-btn-season"
            onClick={() => navigateTo('/pages/seasons/index')}
          >
            <Calendar size={24} color="#ffffff" />
            <Text className="quick-btn-text">赛季管理</Text>
          </View>
        </View>

        {/* 最近战绩 */}
        <View className="card">
          <View className="card-header">
            <Trophy size={24} color="#fbbf24" />
            <Text className="card-title">最近战绩</Text>
          </View>

          {loading ? (
            <View className="loading-container">
              <Text className="loading-text">加载中...</Text>
            </View>
          ) : recentMatches.length === 0 ? (
            <View className="empty-container">
              <Text className="empty-text">暂无战绩记录</Text>
              <Text className="empty-hint">快去录入第一场战绩吧</Text>
            </View>
          ) : (
            <View>
              {recentMatches.map((match) => (
                <View key={match.id} className="match-item">
                  <View className="match-header">
                    <Text className="match-date">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </Text>
                    <Text
                      className={`match-winner ${match.winnerTeam === 1 ? 'winner-team1' : 'winner-team2'}`}
                    >
                      {match.winnerTeam === 1 ? '队伍1获胜' : '队伍2获胜'}
                    </Text>
                  </View>
                  <Text className="match-score">{match.score}</Text>
                  {match.remark && <Text className="match-remark">{match.remark}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 快捷入口 */}
        <View className="shortcuts">
          <View
            className="shortcut-item shortcut-records"
            onClick={() => switchTab('/pages/records/index')}
          >
            <Users size={32} color="#f472b6" />
            <Text className="shortcut-text">战绩列表</Text>
          </View>
          <View
            className="shortcut-item shortcut-stats"
            onClick={() => switchTab('/pages/stats/index')}
          >
            <TrendingUp size={32} color="#34d399" />
            <Text className="shortcut-text">统计分析</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
