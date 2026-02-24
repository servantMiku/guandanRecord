import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { ArrowUpDown, Trophy } from 'lucide-react'
import './index.css'

type Season = {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: string
}

type PlayerStat = {
  id: string
  seasonId: string
  playerId: string
  playerName: string
  totalMatches: number
  wins: number
  winRate: string
}

type SortField = 'playerName' | 'totalMatches' | 'wins' | 'winRate'
type SortOrder = 'asc' | 'desc'

export default function StatsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('wins')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const fetchSeasons = async () => {
    try {
      const res = await Network.request({
        url: '/api/seasons'
      })
      if (res.data && res.data.data) {
        const seasonList = res.data.data
        setSeasons(seasonList)

        // 优先选择活跃赛季
        const activeSeason = seasonList.find((s: Season) => s.status === 'active')
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id)
        } else if (seasonList.length > 0) {
          setSelectedSeasonId(seasonList[0].id)
        }
      }
    } catch (error) {
      console.error('获取赛季列表失败:', error)
    }
  }

  const fetchStats = async (seasonId: string) => {
    if (!seasonId) return

    try {
      setLoading(true)
      const res = await Network.request({
        url: `/api/stats/season`,
        data: { seasonId }
      })
      if (res.data && res.data.data) {
        setStats(res.data.data.playerStats || [])
        setSummary(res.data.data.summary)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      fetchStats(selectedSeasonId)
    }
  }, [selectedSeasonId])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 切换排序方向
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 切换排序字段，默认降序
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortedStats = () => {
    return [...stats].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'playerName':
          comparison = a.playerName.localeCompare(b.playerName, 'zh-CN')
          break
        case 'totalMatches':
          comparison = a.totalMatches - b.totalMatches
          break
        case 'wins':
          comparison = a.wins - b.wins
          break
        case 'winRate':
          comparison = parseFloat(a.winRate) - parseFloat(b.winRate)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  const sortedStats = getSortedStats()

  return (
    <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 赛季选择 */}
      <View className="bg-white/10 backdrop-blur-lg px-4 py-4 border-b border-white/20">
        <Text className="block text-white text-lg font-bold mb-3">选择赛季</Text>
        {seasons.length === 0 ? (
          <View className="bg-white/10 rounded-xl px-4 py-3 text-center">
            <Text className="block text-white/60 text-sm">暂无赛季</Text>
          </View>
        ) : (
          <View className="flex flex-wrap gap-2">
            {seasons.map((season) => (
              <View
                key={season.id}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedSeasonId === season.id
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white'
                    : 'bg-white/10 text-white/60'
                }`}
                onClick={() => setSelectedSeasonId(season.id)}
              >
                {season.name}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 汇总信息 */}
      {summary && (
        <View className="px-4 py-4">
          <View className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 shadow-lg">
            <View className="flex items-center mb-3">
              <Trophy size={24} color="#ffffff" />
              <Text className="block text-white text-lg font-bold ml-2">赛季总结</Text>
            </View>
            <View className="flex justify-between text-white">
              <View className="text-center">
                <Text className="block text-2xl font-bold">{summary.totalMatches}</Text>
                <Text className="block text-sm opacity-80">总场次</Text>
              </View>
              <View className="text-center">
                <Text className="block text-2xl font-bold">{summary.bestPlayer}</Text>
                <Text className="block text-sm opacity-80">最佳玩家</Text>
              </View>
              <View className="text-center">
                <Text className="block text-2xl font-bold">{summary.bestWinRate}</Text>
                <Text className="block text-sm opacity-80">最高胜率</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 排名表格 */}
      <View className="px-4 pb-4">
        <View className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-lg border border-white/20">
          <View className="grid grid-cols-4 gap-2 px-4 py-3 bg-white/20 border-b border-white/10">
            <Text
              className="block text-white text-sm font-semibold flex items-center"
              onClick={() => handleSort('playerName')}
            >
              玩家
              {sortField === 'playerName' && <ArrowUpDown size={14} className="ml-1" />}
            </Text>
            <Text
              className="block text-white text-sm font-semibold flex items-center justify-center"
              onClick={() => handleSort('totalMatches')}
            >
              场次
              {sortField === 'totalMatches' && <ArrowUpDown size={14} className="ml-1" />}
            </Text>
            <Text
              className="block text-white text-sm font-semibold flex items-center justify-center"
              onClick={() => handleSort('wins')}
            >
              胜场
              {sortField === 'wins' && <ArrowUpDown size={14} className="ml-1" />}
            </Text>
            <Text
              className="block text-white text-sm font-semibold flex items-center justify-end"
              onClick={() => handleSort('winRate')}
            >
              胜率
              {sortField === 'winRate' && <ArrowUpDown size={14} className="ml-1" />}
            </Text>
          </View>

          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="block text-white/60 text-sm">加载中...</Text>
            </View>
          ) : sortedStats.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-12">
              <Text className="block text-white/60 text-base">暂无数据</Text>
              <Text className="block text-white/60 text-sm mt-1">选择一个赛季查看统计</Text>
            </View>
          ) : (
            sortedStats.map((stat, index) => (
              <View
                key={stat.id}
                className={`grid grid-cols-4 gap-2 px-4 py-3 ${
                  index !== sortedStats.length - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                <Text className="block text-white text-sm font-medium">{stat.playerName}</Text>
                <Text className="block text-white text-sm text-center">{stat.totalMatches}</Text>
                <Text className="block text-white text-sm text-center">{stat.wins}</Text>
                <Text className="block text-white text-sm text-right">
                  {parseFloat(stat.winRate).toFixed(2)}%
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  )
}
