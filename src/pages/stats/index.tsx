import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Trophy, Flame, TrendingDown, Crown, Medal } from 'lucide-react'
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
  streak: number
  streakType: 'win' | 'lose' | 'none'
}

type SortField = 'playerName' | 'totalMatches' | 'wins' | 'winRate'
type SortOrder = 'asc' | 'desc'

// 连胜/连败图标组件
const StreakIcon = ({ streak, type }: { streak: number; type: string }) => {
  if (streak === 0 || type === 'none') return null

  if (type === 'win' && streak >= 3) {
    return <Flame size={18} color="#ef4444" />
  }
  if (type === 'lose' && streak >= 3) {
    return <TrendingDown size={18} color="#6b7280" />
  }
  return null
}

// 连胜/连败文字
const StreakText = ({ streak, type }: { streak: number; type: string }) => {
  if (streak === 0 || type === 'none') return null

  if (type === 'win') {
    return (
      <Text className="streak-text streak-win">
        {streak}连胜
      </Text>
    )
  }
  return (
    <Text className="streak-text streak-lose">
      {streak}连败
    </Text>
  )
}

// 排名图标
const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <View className="rank-badge rank-gold">
        <Crown size={16} color="#ffffff" />
      </View>
    )
  }
  if (rank === 2) {
    return (
      <View className="rank-badge rank-silver">
        <Medal size={16} color="#ffffff" />
      </View>
    )
  }
  if (rank === 3) {
    return (
      <View className="rank-badge rank-bronze">
        <Medal size={16} color="#ffffff" />
      </View>
    )
  }
  return (
    <View className="rank-badge rank-normal">
      <Text className="rank-number">{rank}</Text>
    </View>
  )
}

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
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
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
    <View className="stats-page">
      {/* 赛季选择 */}
      <View className="season-selector">
        <Text className="selector-title">选择赛季</Text>
        {seasons.length === 0 ? (
          <View className="empty-season">
            <Text className="empty-text">暂无赛季</Text>
          </View>
        ) : (
          <View className="season-tags">
            {seasons.map((season) => (
              <View
                key={season.id}
                className={`season-tag ${selectedSeasonId === season.id ? 'season-tag-active' : ''}`}
                onClick={() => setSelectedSeasonId(season.id)}
              >
                <Text className="season-tag-text">{season.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 汇总信息 */}
      {summary && (
        <View className="summary-card">
          <View className="summary-header">
            <Trophy size={24} color="#ffffff" />
            <Text className="summary-title">赛季总结</Text>
          </View>
          <View className="summary-stats">
            <View className="summary-stat">
              <Text className="summary-value">{summary.totalMatches}</Text>
              <Text className="summary-label">总场次</Text>
            </View>
            <View className="summary-stat">
              <Text className="summary-value">{summary.bestPlayer}</Text>
              <Text className="summary-label">最佳玩家</Text>
            </View>
            <View className="summary-stat">
              <Text className="summary-value">{summary.bestWinRate}</Text>
              <Text className="summary-label">最高胜率</Text>
            </View>
          </View>
        </View>
      )}

      {/* 排名表格 */}
      <View className="ranking-card">
        {/* 表头 */}
        <View className="table-header">
          <View className="table-cell table-cell-rank">
            <Text className="table-header-text">排名</Text>
          </View>
          <View className="table-cell" onClick={() => handleSort('playerName')}>
            <Text className="table-header-text">玩家</Text>
          </View>
          <View className="table-cell table-cell-center" onClick={() => handleSort('totalMatches')}>
            <Text className="table-header-text">场次</Text>
          </View>
          <View className="table-cell table-cell-center" onClick={() => handleSort('wins')}>
            <Text className="table-header-text">胜场</Text>
          </View>
          <View className="table-cell table-cell-right" onClick={() => handleSort('winRate')}>
            <Text className="table-header-text">胜率</Text>
          </View>
        </View>

        {loading ? (
          <View className="loading-container">
            <Text className="loading-text">加载中...</Text>
          </View>
        ) : sortedStats.length === 0 ? (
          <View className="empty-container">
            <Text className="empty-text">暂无数据</Text>
            <Text className="empty-hint">选择一个赛季查看统计</Text>
          </View>
        ) : (
          <View>
            {sortedStats.map((stat, index) => (
              <View
                key={stat.id}
                className={`table-row ${index < 3 ? `table-row-top${index + 1}` : ''} ${index !== sortedStats.length - 1 ? 'table-row-bordered' : ''}`}
              >
                {/* 排名 */}
                <View className="table-cell table-cell-rank">
                  <RankIcon rank={index + 1} />
                </View>
                
                {/* 玩家信息 */}
                <View className="table-cell">
                  <View className="player-info">
                    <Text className="table-cell-text player-name">{stat.playerName}</Text>
                    {/* 连胜/连败 */}
                    <View className="streak-info">
                      <StreakIcon streak={stat.streak} type={stat.streakType} />
                      <StreakText streak={stat.streak} type={stat.streakType} />
                    </View>
                  </View>
                </View>
                
                {/* 场次 */}
                <View className="table-cell table-cell-center">
                  <Text className="table-cell-text">{stat.totalMatches}</Text>
                </View>
                
                {/* 胜场 */}
                <View className="table-cell table-cell-center">
                  <Text className="table-cell-text wins-text">{stat.wins}</Text>
                </View>
                
                {/* 胜率 */}
                <View className="table-cell table-cell-right">
                  <Text className={`table-cell-text ${parseFloat(stat.winRate) >= 60 ? 'win-rate-high' : parseFloat(stat.winRate) >= 40 ? 'win-rate-medium' : 'win-rate-low'}`}>
                    {parseFloat(stat.winRate).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
