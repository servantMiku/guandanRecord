import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Trophy, Calendar, Filter } from 'lucide-react'
import './index.css'

type Season = {
  id: string
  name: string
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
  team1Player1?: Player
  team1Player2?: Player
  team2Player1?: Player
  team2Player2?: Player
}

type Player = {
  id: string
  name: string
}

export default function RecordsPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const fetchSeasons = async () => {
    try {
      const res = await Network.request({
        url: '/api/seasons'
      })
      if (res.data && res.data.data) {
        setSeasons(res.data.data)
        // 默认选择活跃赛季或第一个赛季
        const activeSeason = res.data.data.find((s: Season) => s.status === 'active')
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id)
        } else if (res.data.data.length > 0) {
          setSelectedSeasonId(res.data.data[0].id)
        }
      }
    } catch (error) {
      console.error('获取赛季列表失败:', error)
    }
  }

  const fetchMatches = async (seasonId: string) => {
    if (!seasonId) return

    try {
      setLoading(true)
      const res = await Network.request({
        url: '/api/matches',
        data: { seasonId }
      })
      if (res.data && res.data.data) {
        setMatches(res.data.data)
      }
    } catch (error) {
      console.error('获取战绩列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      fetchMatches(selectedSeasonId)
    }
  }, [selectedSeasonId])

  const handleMatchClick = (matchId: string) => {
    Taro.navigateTo({ url: `/pages/record-detail/index?id=${matchId}` })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`

    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 赛季筛选 */}
      <View className="bg-white/10 backdrop-blur-lg px-4 py-4 border-b border-white/20">
        <View className="flex items-center mb-3">
          <Filter size={20} color="#f472b6" />
          <Text className="block text-white text-base font-semibold ml-2">筛选赛季</Text>
        </View>
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

      {/* 战绩列表 */}
      <View className="px-4 py-4">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-white/60 text-base">加载中...</Text>
          </View>
        ) : matches.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <Trophy size={64} color="#ffffff/20" />
            <Text className="block text-white/60 text-base mt-4">暂无战绩记录</Text>
            <Text className="block text-white/40 text-sm mt-2">选择一个赛季查看战绩</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {matches.map((match) => (
              <View
                key={match.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 active:bg-white/20 transition-all"
                onClick={() => handleMatchClick(match.id)}
              >
                {/* 日期和胜者 */}
                <View className="flex items-center justify-between mb-3">
                  <View className="flex items-center">
                    <Calendar size={16} color="#fbbf24" />
                    <Text className="block text-white/60 text-sm ml-2">{formatDate(match.createdAt)}</Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${
                      match.winnerTeam === 1
                        ? 'bg-gradient-to-r from-pink-500 to-rose-600'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                    }`}
                  >
                    <Text className="block text-white text-xs font-bold">
                      队伍{match.winnerTeam}获胜
                    </Text>
                  </View>
                </View>

                {/* 比分 */}
                <Text className="block text-white text-2xl font-bold text-center mb-3">{match.score}</Text>

                {/* 备注 */}
                {match.remark && (
                  <Text className="block text-white/40 text-sm text-center">{match.remark}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
