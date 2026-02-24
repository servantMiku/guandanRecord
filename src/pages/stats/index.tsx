import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Trophy, TrendingUp, Calendar, Award } from 'lucide-react'
import './index.css'

type Season = {
  id: string
  name: string
  status: string
}

type PlayerStats = {
  id: string
  seasonId: string
  playerId: string
  playerName: string
  totalMatches: number
  wins: number
  winRate: string
}

type SeasonSummary = {
  seasonId: string
  seasonName: string
  totalMatches: number
  bestPlayer: string
  bestWinRate: string
}

export default function StatsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'winRate' | 'wins'>('winRate')

  const fetchData = async () => {
    try {
      if (!selectedSeasonId) return

      // 获取统计数据
      const res = await Network.request({
        url: '/api/stats/season',
        data: { seasonId: selectedSeasonId }
      })

      if (res.data && res.data.data) {
        setPlayerStats(res.data.data.playerStats || [])
        setSeasonSummary(res.data.data.summary || null)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSeasons = async () => {
    try {
      const res = await Network.request({
        url: '/api/seasons'
      })

      if (res.data && res.data.data && res.data.data.length > 0) {
        setSeasons(res.data.data)
        // 默认选择活跃赛季或第一个赛季
        const activeSeason = res.data.data.find((s: Season) => s.status === 'active') || res.data.data[0]
        setSelectedSeasonId(activeSeason.id)
      }
    } catch (error) {
      console.error('获取赛季列表失败:', error)
    }
  }

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      setLoading(true)
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId])

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId)
  }

  const sortedStats = [...playerStats].sort((a, b) => {
    if (sortBy === 'winRate') {
      return parseFloat(b.winRate) - parseFloat(a.winRate)
    } else {
      return b.wins - a.wins
    }
  })

  return (
    <View className="min-h-screen bg-stone-50">
      {/* 赛季选择 */}
      <View className="bg-white px-4 py-3 border-b border-stone-100">
        <View className="flex items-center justify-between">
          <Text className="block text-base font-medium text-amber-950">选择赛季</Text>
          <View className="flex gap-2">
            {seasons.map((season) => (
              <Text
                key={season.id}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedSeasonId === season.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-100 text-stone-700'
                }`}
                onClick={() => handleSeasonChange(season.id)}
              >
                {season.name}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View className="px-4 py-4">
        {/* 赛季概览 */}
        {seasonSummary && (
          <View className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 mb-4 text-white">
            <View className="flex items-center mb-3">
              <Calendar size={20} />
              <Text className="text-lg font-bold ml-2">{seasonSummary.seasonName}</Text>
            </View>

            <View className="grid grid-cols-2 gap-4">
              <View>
                <Text className="block text-amber-100 text-sm mb-1">总场次</Text>
                <Text className="block text-3xl font-bold">{seasonSummary.totalMatches}</Text>
              </View>
              <View>
                <Text className="block text-amber-100 text-sm mb-1">最佳战绩</Text>
                <View className="flex items-center">
                  <Award size={20} />
                  <Text className="block text-base font-bold ml-1">{seasonSummary.bestPlayer}</Text>
                </View>
                <Text className="block text-sm text-amber-100 mt-1">{seasonSummary.bestWinRate}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 排序按钮 */}
        <View className="flex gap-2 mb-4">
          <View
            className={`flex-1 py-2 rounded-lg text-center text-sm font-medium ${
              sortBy === 'winRate' ? 'bg-amber-500 text-white' : 'bg-white text-stone-700'
            }`}
            onClick={() => setSortBy('winRate')}
          >
            <TrendingUp size={16} className="inline-block mr-1" />
            按胜率
          </View>
          <View
            className={`flex-1 py-2 rounded-lg text-center text-sm font-medium ${
              sortBy === 'wins' ? 'bg-amber-500 text-white' : 'bg-white text-stone-700'
            }`}
            onClick={() => setSortBy('wins')}
          >
            <Trophy size={16} className="inline-block mr-1" />
            按胜场
          </View>
        </View>

        {/* 玩家排名 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="block text-lg font-semibold text-amber-950 mb-4">玩家排名</Text>

          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="block text-stone-400 text-sm">加载中...</Text>
            </View>
          ) : sortedStats.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-8">
              <Text className="block text-stone-400 text-base">暂无统计数据</Text>
            </View>
          ) : (
            <View>
              {sortedStats.map((stat, index) => (
                <View key={stat.id} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
                  <View className="flex items-center">
                    {/* 排名 */}
                    <View
                      className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        index === 0
                          ? 'bg-amber-500 text-white'
                          : index === 1
                          ? 'bg-amber-400 text-white'
                          : index === 2
                          ? 'bg-amber-300 text-white'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      <Text className="block text-sm font-bold">{index + 1}</Text>
                    </View>

                    {/* 玩家名 */}
                    <Text className="block text-base font-medium text-amber-950">
                      {stat.playerName}
                    </Text>
                  </View>

                  {/* 统计数据 */}
                  <View className="flex items-center gap-4">
                    <View className="text-right">
                      <Text className="block text-xs text-stone-400">胜场</Text>
                      <Text className="block text-lg font-bold text-amber-500">{stat.wins}</Text>
                    </View>
                    <View className="text-right">
                      <Text className="block text-xs text-stone-400">胜率</Text>
                      <Text className="block text-lg font-bold text-green-500">{stat.winRate}%</Text>
                    </View>
                    <View className="text-right">
                      <Text className="block text-xs text-stone-400">场次</Text>
                      <Text className="block text-base text-stone-700">{stat.totalMatches}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
