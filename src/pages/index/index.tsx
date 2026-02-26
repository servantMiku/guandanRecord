import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import './index.css'

// 图标组件 - 使用 Unicode 字符
const Icon = ({ name, size = 24, color }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    Trophy: '🏆',
    Calendar: '📅',
    Plus: '＋',
    Users: '👥',
    TrendingUp: '📈',
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

type Player = {
  id: string
  name: string
}

type Match = {
  id: string
  seasonId: string
  team1Player1Id: string
  team1_player1_id: string
  team1Player2Id: string
  team1_player2_id: string
  team2Player1Id: string
  team2_player1_id: string
  team2Player2Id: string
  team2_player2_id: string
  winnerTeam: number
  winner_team: number
  score: string
  remark: string | null
  createdAt: string
  created_at: string
  seasons?: Season
}

export default function IndexPage() {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      // 获取玩家列表
      const playersRes = await Network.request({
        url: '/api/players'
      })
      if (playersRes.data && playersRes.data.data) {
        setPlayers(playersRes.data.data)
      }

      // 获取当前活跃赛季
      const res = await Network.request({
        url: '/api/seasons/active'
      })
      let activeSeason: Season | null = null
      if (res.data && res.data.data && res.data.data.length > 0) {
        activeSeason = res.data.data[0]
        setCurrentSeason(activeSeason)
      }

      // 获取最近战绩（按当前赛季筛选，限制3场）
      const matchRes = await Network.request({
        url: '/api/matches/recent',
        data: { 
          limit: '3',
          seasonId: activeSeason?.id 
        }
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

  // 页面显示时刷新数据
  useDidShow(() => {
    fetchData()
  })

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

  // 获取玩家名字缩写
  const getPlayerInitial = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name.charAt(0).toUpperCase() : '?'
  }

  // 获取玩家全名
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name : '未知'
  }

  // 解析比分
  const parseScore = (score: string) => {
    // 格式: "队伍1：A2，队伍2：6"
    const match = score.match(/队伍1：(.+?)，队伍2：(.+)/)
    if (match) {
      return { team1: match[1], team2: match[2] }
    }
    return { team1: '?', team2: '?' }
  }

  // 格式化时间
  const formatDate = (dateString: string) => {
    if (!dateString) return '未知时间'
    try {
      const date = new Date(dateString)
      if (Number.isNaN(date.getTime())) return '未知时间'
      
      const now = new Date()
      
      // 获取本地日期字符串（年月日）进行比较
      const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      const nowStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      
      // 计算日期差（通过比较年月日）
      const dateObj = new Date(dateStr)
      const nowObj = new Date(nowStr)
      const diffTime = nowObj.getTime() - dateObj.getTime()
      const days = Math.round(diffTime / (1000 * 60 * 60 * 24))

      if (days === 0) return '今天'
      if (days === 1) return '昨天'
      if (days < 7) return `${days}天前`

      return `${date.getMonth() + 1}月${date.getDate()}日`
    } catch {
      return '未知时间'
    }
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
            <Icon name="Plus" size={24} color="#ffffff" />
            <Text className="quick-btn-text">录入战绩</Text>
          </View>
          <View
            className="quick-btn quick-btn-season"
            onClick={() => navigateTo('/pages/seasons/index')}
          >
            <Icon name="Calendar" size={24} color="#ffffff" />
            <Text className="quick-btn-text">赛季管理</Text>
          </View>
        </View>

        {/* 最近战绩 */}
        <View className="card">
          <View className="card-header">
            <Icon name="Trophy" size={24} color="#fbbf24" />
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
              {recentMatches.map((match) => {
                const score = parseScore(match.score)
                const isTeam1Win = (match.winner_team || match.winnerTeam) === 1
                
                // 获胜方和失败方的玩家（使用下划线字段名）
                const winnerP1 = isTeam1Win ? (match.team1_player1_id || match.team1Player1Id) : (match.team2_player1_id || match.team2Player1Id)
                const winnerP2 = isTeam1Win ? (match.team1_player2_id || match.team1Player2Id) : (match.team2_player2_id || match.team2Player2Id)
                const loserP1 = isTeam1Win ? (match.team2_player1_id || match.team2Player1Id) : (match.team1_player1_id || match.team1Player1Id)
                const loserP2 = isTeam1Win ? (match.team2_player2_id || match.team2Player2Id) : (match.team1_player2_id || match.team1Player2Id)
                const winnerScore = isTeam1Win ? score.team1 : score.team2
                const loserScore = isTeam1Win ? score.team2 : score.team1

                return (
                  <View key={match.id} className="match-item">
                    <Text className="match-date">{formatDate(match.created_at || match.createdAt)}</Text>
                    
                    <View className="match-teams">
                      {/* 获胜方 */}
                      <View className="match-team winner-team">
                        <View className="team-avatars">
                          <View className="player-avatar-wrapper">
                            <View className="player-avatar winner-avatar">
                              <Text className="avatar-text">{getPlayerInitial(winnerP1)}</Text>
                            </View>
                            <Text className="avatar-name winner-name">{getPlayerName(winnerP1)}</Text>
                          </View>
                          <Text className="player-plus">+</Text>
                          <View className="player-avatar-wrapper">
                            <View className="player-avatar winner-avatar">
                              <Text className="avatar-text">{getPlayerInitial(winnerP2)}</Text>
                            </View>
                            <Text className="avatar-name winner-name">{getPlayerName(winnerP2)}</Text>
                          </View>
                        </View>
                        <View className="team-score winner-score">
                          <Text className="score-text">{winnerScore}</Text>
                        </View>
                      </View>

                      {/* VS 分隔符 */}
                      <View className="match-vs-wrapper">
                        <Text className="match-vs">VS</Text>
                      </View>

                      {/* 失败方 */}
                      <View className="match-team loser-team">
                        <View className="team-avatars">
                          <View className="player-avatar-wrapper">
                            <View className="player-avatar loser-avatar">
                              <Text className="avatar-text">{getPlayerInitial(loserP1)}</Text>
                            </View>
                            <Text className="avatar-name loser-name">{getPlayerName(loserP1)}</Text>
                          </View>
                          <Text className="player-plus">+</Text>
                          <View className="player-avatar-wrapper">
                            <View className="player-avatar loser-avatar">
                              <Text className="avatar-text">{getPlayerInitial(loserP2)}</Text>
                            </View>
                            <Text className="avatar-name loser-name">{getPlayerName(loserP2)}</Text>
                          </View>
                        </View>
                        <View className="team-score loser-score">
                          <Text className="score-text">{loserScore}</Text>
                        </View>
                      </View>
                    </View>

                    {match.remark && <Text className="match-remark">{match.remark}</Text>}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* 快捷入口 */}
        <View className="shortcuts">
          <View
            className="shortcut-item shortcut-records"
            onClick={() => switchTab('/pages/records/index')}
          >
            <Icon name="Users" size={32} color="#f472b6" />
            <Text className="shortcut-text">战绩列表</Text>
          </View>
          <View
            className="shortcut-item shortcut-stats"
            onClick={() => switchTab('/pages/stats/index')}
          >
            <Icon name="TrendingUp" size={32} color="#34d399" />
            <Text className="shortcut-text">统计分析</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
