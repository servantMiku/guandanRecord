import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Trophy, Calendar, Users, TrendingUp } from 'lucide-react'
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

  return (
    <View className="min-h-screen bg-stone-50">
      {/* 头部 - 当前赛季 */}
      <View className="bg-amber-500 px-4 py-6">
        <Text className="block text-white text-xl font-bold mb-2">掼蛋战绩</Text>
        {currentSeason ? (
          <View>
            <Text className="block text-white text-lg mb-1">{currentSeason.name}</Text>
            <Text className="block text-amber-100 text-sm">
              {currentSeason.startDate} - {currentSeason.endDate || '进行中'}
            </Text>
          </View>
        ) : (
          <Text className="block text-amber-100 text-base">暂无活跃赛季</Text>
        )}
      </View>

      {/* 快捷操作 */}
      <View className="px-4 py-4">
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex justify-around">
            <View className="flex flex-col items-center" onClick={() => navigateTo('/pages/seasons/index')}>
              <View className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                <Calendar size={24} color="#f59e0b" />
              </View>
              <Text className="block text-stone-700 text-sm">赛季管理</Text>
            </View>
            <View className="flex flex-col items-center" onClick={() => switchTab('/pages/records/index')}>
              <View className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                <Users size={24} color="#f59e0b" />
              </View>
              <Text className="block text-stone-700 text-sm">录入战绩</Text>
            </View>
            <View className="flex flex-col items-center" onClick={() => switchTab('/pages/stats/index')}>
              <View className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                <TrendingUp size={24} color="#f59e0b" />
              </View>
              <Text className="block text-stone-700 text-sm">统计分析</Text>
            </View>
          </View>
        </View>

        {/* 最近战绩 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex items-center justify-between mb-4">
            <View className="flex items-center">
              <Trophy size={20} color="#f59e0b" />
              <Text className="block text-lg font-semibold text-amber-950 ml-2">最近战绩</Text>
            </View>
            <Text
              className="text-amber-500 text-sm"
              onClick={() => switchTab('/pages/records/index')}
            >
              查看全部
            </Text>
          </View>

          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="block text-stone-400 text-sm">加载中...</Text>
            </View>
          ) : recentMatches.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-8">
              <Text className="block text-stone-400 text-base">暂无战绩记录</Text>
              <Text className="block text-stone-400 text-sm mt-1">快去录入第一场战绩吧</Text>
            </View>
          ) : (
            <View>
              {recentMatches.map((match) => (
                <View key={match.id} className="border-b border-stone-100 py-3 last:border-0">
                  <View className="flex items-center justify-between mb-2">
                    <Text className="block text-sm text-stone-400">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </Text>
                    <Text className={`block text-sm font-medium ${match.winnerTeam === 1 ? 'text-green-500' : 'text-amber-500'}`}>
                      {match.winnerTeam === 1 ? '队伍1获胜' : '队伍2获胜'}
                    </Text>
                  </View>
                  <Text className="block text-base text-amber-950 font-medium">{match.score}</Text>
                  {match.remark && (
                    <Text className="block text-sm text-stone-400 mt-1">{match.remark}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
