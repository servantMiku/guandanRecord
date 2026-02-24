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
        <View className="table-header">
          <View className="table-cell" onClick={() => handleSort('playerName')}>
            <Text className="table-header-text">玩家</Text>
            {sortField === 'playerName' && <ArrowUpDown size={14} className="sort-icon" />}
          </View>
          <View className="table-cell table-cell-center" onClick={() => handleSort('totalMatches')}>
            <Text className="table-header-text">场次</Text>
            {sortField === 'totalMatches' && <ArrowUpDown size={14} className="sort-icon" />}
          </View>
          <View className="table-cell table-cell-center" onClick={() => handleSort('wins')}>
            <Text className="table-header-text">胜场</Text>
            {sortField === 'wins' && <ArrowUpDown size={14} className="sort-icon" />}
          </View>
          <View className="table-cell table-cell-right" onClick={() => handleSort('winRate')}>
            <Text className="table-header-text">胜率</Text>
            {sortField === 'winRate' && <ArrowUpDown size={14} className="sort-icon" />}
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
                className={`table-row ${index !== sortedStats.length - 1 ? 'table-row-bordered' : ''}`}
              >
                <View className="table-cell">
                  <Text className="table-cell-text">{stat.playerName}</Text>
                </View>
                <View className="table-cell table-cell-center">
                  <Text className="table-cell-text">{stat.totalMatches}</Text>
                </View>
                <View className="table-cell table-cell-center">
                  <Text className="table-cell-text">{stat.wins}</Text>
                </View>
                <View className="table-cell table-cell-right">
                  <Text className="table-cell-text">{parseFloat(stat.winRate).toFixed(2)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
