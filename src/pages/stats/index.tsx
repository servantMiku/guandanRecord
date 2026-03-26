import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import './index.css'

// 图标组件 - 使用 Unicode 字符
const Icon = ({ name, size = 24, color }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    Trophy: '🏆',
    Flame: '🔥',
    TrendingDown: '📉',
    Crown: '👑',
    Medal: '🥇',
    MedalSilver: '🥈',
    MedalBronze: '🥉',
    Users: '👥',
    Eye: '👁',
    EyeOff: '🙈',
  }
  return (
    <Text style={{ fontSize: `${size}px`, color, lineHeight: 1 }}>{icons[name] || '•'}</Text>
  )
}

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
  maxWinStreak: number
  maxLoseStreak: number
}

type PartnerStat = {
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  totalMatches: number
  wins: number
  winRate: string
}

type PlayerPairStat = {
  partnerId: string
  partnerName: string
  totalMatches: number
  wins: number
  winRate: string
}

type PlayerPairMatrixItem = {
  playerId: string
  playerName: string
  partners: PlayerPairStat[]
}

type SortField = 'playerName' | 'totalMatches' | 'wins' | 'winRate'
type SortOrder = 'asc' | 'desc'

// 连胜/连败图标组件
const StreakIcon = ({ streak, type }: { streak: number; type: string }) => {
  if (streak === 0 || type === 'none') return null

  if (type === 'win' && streak >= 3) {
    return <Icon name="Flame" size={18} color="#ef4444" />
  }
  if (type === 'lose' && streak >= 3) {
    return <Icon name="TrendingDown" size={18} color="#6b7280" />
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
        <Icon name="Crown" size={16} color="#ffffff" />
      </View>
    )
  }
  if (rank === 2) {
    return (
      <View className="rank-badge rank-silver">
        <Icon name="MedalSilver" size={16} color="#ffffff" />
      </View>
    )
  }
  if (rank === 3) {
    return (
      <View className="rank-badge rank-bronze">
        <Icon name="MedalBronze" size={16} color="#ffffff" />
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
  const [partnerStats, setPartnerStats] = useState<PartnerStat[]>([])
  const [playerPairMatrix, setPlayerPairMatrix] = useState<PlayerPairMatrixItem[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('winRate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const fetchSeasons = async () => {
    try {
      const res = await Network.request({
        url: '/api/seasons'
      })
      if (res.data && res.data.data) {
        const seasonList = res.data.data
        setSeasons(seasonList)

        // 默认选择累计（全量统计）
        setSelectedSeasonId('all')
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
        setPartnerStats(res.data.data.partnerStats || [])
        setPlayerPairMatrix(res.data.data.playerPairMatrix || [])
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

  // 页面显示时刷新数据
  useDidShow(() => {
    fetchSeasons()
    if (selectedSeasonId) {
      fetchStats(selectedSeasonId)
    }
  })

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

  // 默认排序：胜率优先，胜场次之
  const getSortedStats = () => {
    return [...stats].sort((a, b) => {
      // 首先按胜率排序
      const winRateDiff = parseFloat(a.winRate) - parseFloat(b.winRate)
      if (Math.abs(winRateDiff) > 0.01) {
        return sortOrder === 'asc' ? winRateDiff : -winRateDiff
      }
      
      // 胜率相同则按胜场排序
      const winsDiff = a.wins - b.wins
      if (winsDiff !== 0) {
        return sortOrder === 'asc' ? winsDiff : -winsDiff
      }

      // 其他排序字段
      let comparison = 0
      switch (sortField) {
        case 'playerName':
          comparison = a.playerName.localeCompare(b.playerName, 'zh-CN')
          break
        case 'totalMatches':
          comparison = a.totalMatches - b.totalMatches
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
            {/* 累计选项 */}
            <View
              className={`season-tag ${selectedSeasonId === 'all' ? 'season-tag-active' : ''}`}
              onClick={() => setSelectedSeasonId('all')}
            >
              <Text className="season-tag-text">累计</Text>
            </View>
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
            <Icon name="Trophy" size={28} color="#ffffff" />
            <Text className="summary-title">赛季总结</Text>
          </View>
          <View className="summary-stats">
            <View className="summary-stat">
              <Text className="summary-value">{summary.totalMatches}</Text>
              <Text className="summary-label">总场次</Text>
            </View>
            <View className="summary-stat">
              <View className="best-player-wrapper">
                <Text className="summary-value">{summary.bestPlayer}</Text>
                {selectedSeasonId === 'all' && summary.bestPlayer && summary.bestPlayer !== '暂无' && (
                  <View className="goat-badge">
                    <Text className="goat-text">GOAT</Text>
                  </View>
                )}
              </View>
              <Text className="summary-label">最佳玩家</Text>
            </View>
            <View className="summary-stat">
              <Text className="summary-value">{summary.bestWinRate}</Text>
              <Text className="summary-label">最高胜率</Text>
            </View>
          </View>
          {/* 最佳搭档 */}
          {summary.bestPartner && summary.bestPartner !== '' && summary.bestPartner !== '-' && (
            <View className="best-partner-section">
              <View className="best-partner-divider" />
              <View className="best-partner-header">
                <Icon name="Users" size={24} color="#fbbf24" />
                <Text className="best-partner-title">最佳搭档</Text>
              </View>
              <View className="best-partner-content">
                <Text className="best-partner-name">{summary.bestPartner}</Text>
                <View className="best-partner-stats">
                  <Text className="best-partner-winrate">{summary.bestPartnerWinRate}</Text>
                  <Text className="best-partner-wins">({summary.bestPartnerWins}胜)</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* 最长连胜 */}
          {summary.longestWinStreak && summary.longestWinStreak.streak > 0 && (
            <View className="longest-streak-section">
              <View className="best-partner-divider" />
              <View className="best-partner-header">
                <Icon name="Flame" size={24} color="#ef4444" />
                <Text className="best-partner-title">最长连胜</Text>
              </View>
              <View className="best-partner-content">
                <Text className="best-partner-name">{summary.longestWinStreak.playerName}</Text>
                <View className="best-partner-stats">
                  <Text className="best-partner-winrate" style={{ color: '#ffffff' }}>{summary.longestWinStreak.streak}场</Text>
                </View>
              </View>
            </View>
          )}
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
          <View className="table-cell table-cell-center">
            <Text className="table-header-text">最长连胜</Text>
          </View>
          <View className="table-cell table-cell-center">
            <Text className="table-header-text">最长连败</Text>
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
                
                {/* 最长连胜 */}
                <View className="table-cell table-cell-center">
                  <Text className={`table-cell-text ${stat.maxWinStreak >= 3 ? 'streak-highlight-win' : ''}`}>
                    {stat.maxWinStreak > 0 ? stat.maxWinStreak : '-'}
                  </Text>
                </View>
                
                {/* 最长连败 */}
                <View className="table-cell table-cell-center">
                  <Text className={`table-cell-text ${stat.maxLoseStreak >= 3 ? 'streak-highlight-lose' : ''}`}>
                    {stat.maxLoseStreak > 0 ? stat.maxLoseStreak : '-'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 搭档统计表格 */}
      {partnerStats.length > 0 && (
        <View className="partner-card">
          <View className="partner-header">
            <Icon name="Users" size={28} color="#fbbf24" />
            <Text className="partner-title">搭档统计</Text>
          </View>
          
          {/* 搭档表头 */}
          <View className="partner-table-header">
            <View className="partner-cell partner-cell-rank">
              <Text className="partner-header-text">排名</Text>
            </View>
            <View className="partner-cell">
              <Text className="partner-header-text">搭档组合</Text>
            </View>
            <View className="partner-cell partner-cell-center">
              <Text className="partner-header-text">场次</Text>
            </View>
            <View className="partner-cell partner-cell-center">
              <Text className="partner-header-text">胜场</Text>
            </View>
            <View className="partner-cell partner-cell-right">
              <Text className="partner-header-text">胜率</Text>
            </View>
          </View>

          {/* 搭档列表 */}
          <View>
            {partnerStats.map((partner, index) => (
              <View
                key={`${partner.player1Id}_${partner.player2Id}`}
                className={`partner-row ${index < 3 ? `partner-row-top${index + 1}` : ''} ${index !== partnerStats.length - 1 ? 'partner-row-bordered' : ''}`}
              >
                {/* 排名 */}
                <View className="partner-cell partner-cell-rank">
                  <RankIcon rank={index + 1} />
                </View>
                
                {/* 搭档组合 */}
                <View className="partner-cell">
                  <Text className="partner-cell-text partner-names">
                    {partner.player1Name} + {partner.player2Name}
                  </Text>
                </View>
                
                {/* 场次 */}
                <View className="partner-cell partner-cell-center">
                  <Text className="partner-cell-text">{partner.totalMatches}</Text>
                </View>
                
                {/* 胜场 */}
                <View className="partner-cell partner-cell-center">
                  <Text className="partner-cell-text partner-wins">{partner.wins}</Text>
                </View>
                
                {/* 胜率 */}
                <View className="partner-cell partner-cell-right">
                  <Text className={`partner-cell-text ${parseFloat(partner.winRate) >= 60 ? 'win-rate-high' : parseFloat(partner.winRate) >= 40 ? 'win-rate-medium' : 'win-rate-low'}`}>
                    {parseFloat(partner.winRate).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 玩家两两胜率矩阵 */}
      {playerPairMatrix.length > 0 && (
        <View className="pair-matrix-card">
          <View className="pair-matrix-header">
            <Icon name="Users" size={28} color="#3b82f6" />
            <Text className="pair-matrix-title">搭档胜率矩阵</Text>
          </View>
          
          {playerPairMatrix.map((player) => (
            <View key={player.playerId} className="pair-matrix-row">
              <View className="pair-matrix-player">
                <Text className="pair-matrix-player-name">{player.playerName}</Text>
              </View>
              <View className="pair-matrix-partners">
                {player.partners.map((partner) => (
                  <View key={partner.partnerId} className="pair-matrix-item">
                    <Text className="pair-matrix-partner-name">{partner.partnerName}</Text>
                    <Text className={`pair-matrix-winrate ${parseFloat(partner.winRate) >= 60 ? 'win-rate-high' : parseFloat(partner.winRate) >= 40 ? 'win-rate-medium' : 'win-rate-low'}`}>
                      {parseFloat(partner.winRate).toFixed(0)}%
                    </Text>
                    <Text className="pair-matrix-matches">{partner.totalMatches}场</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
