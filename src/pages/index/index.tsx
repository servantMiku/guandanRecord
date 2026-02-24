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
      Taro.showToast({ title: '请先创建赛季', icon: 'none' })
      return
    }
    navigateTo(`/pages/record-form/index?seasonId=${currentSeason.id}`)
  }

  return (
    <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 头部 - 当前赛季 */}
      <View className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-6 shadow-lg">
        <Text className="block text-white text-2xl font-bold mb-2">掼蛋战绩</Text>
        {currentSeason ? (
          <View>
            <Text className="block text-white text-lg mb-1">{currentSeason.name}</Text>
            <Text className="block text-violet-200 text-sm">
              {currentSeason.startDate} - {currentSeason.endDate || '进行中'}
            </Text>
          </View>
        ) : (
          <Text className="block text-violet-200 text-base">暂无活跃赛季</Text>
        )}
      </View>

      <View className="px-4 py-4">
        {/* 快捷操作 */}
        <View className="flex gap-3 mb-4">
          <View
            className="flex-1 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl py-4 flex items-center justify-center shadow-lg"
            onClick={handleAddRecord}
          >
            <Plus size={24} color="#ffffff" />
            <Text className="text-white font-bold ml-2">录入战绩</Text>
          </View>
          <View
            className="flex-1 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl py-4 flex items-center justify-center shadow-lg"
            onClick={() => navigateTo('/pages/seasons/index')}
          >
            <Calendar size={24} color="#ffffff" />
            <Text className="text-white font-bold ml-2">赛季管理</Text>
          </View>
        </View>

        {/* 最近战绩 */}
        <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20 mb-4">
          <View className="flex items-center mb-4">
            <Trophy size={24} color="#fbbf24" />
            <Text className="block text-xl font-bold text-white ml-2">最近战绩</Text>
          </View>

          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="block text-white/60 text-sm">加载中...</Text>
            </View>
          ) : recentMatches.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-8">
              <Text className="block text-white/60 text-base">暂无战绩记录</Text>
              <Text className="block text-white/60 text-sm mt-1">快去录入第一场战绩吧</Text>
            </View>
          ) : (
            <View>
              {recentMatches.map((match) => (
                <View key={match.id} className="bg-white/10 rounded-xl p-4 mb-3 last:mb-0 border border-white/10">
                  <View className="flex items-center justify-between mb-2">
                    <Text className="block text-sm text-white/60">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </Text>
                    <Text className={`text-sm font-bold ${match.winnerTeam === 1 ? 'text-green-400' : 'text-pink-400'}`}>
                      {match.winnerTeam === 1 ? '队伍1获胜' : '队伍2获胜'}
                    </Text>
                  </View>
                  <Text className="block text-xl font-bold text-white mb-1">{match.score}</Text>
                  {match.remark && (
                    <Text className="block text-sm text-white/60">{match.remark}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 快捷入口 */}
        <View className="flex gap-3">
          <View
            className="flex-1 bg-white/10 backdrop-blur-lg rounded-2xl p-4 flex flex-col items-center border border-white/20"
            onClick={() => switchTab('/pages/records/index')}
          >
            <Users size={32} color="#f472b6" />
            <Text className="block text-white font-medium mt-2">战绩列表</Text>
          </View>
          <View
            className="flex-1 bg-white/10 backdrop-blur-lg rounded-2xl p-4 flex flex-col items-center border border-white/20"
            onClick={() => switchTab('/pages/stats/index')}
          >
            <TrendingUp size={32} color="#34d399" />
            <Text className="block text-white font-medium mt-2">统计分析</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
