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

      // 获取最近战绩（按当前赛季筛选，限制5场）
      const matchRes = await Network.request({
        url: '/api/matches/recent',
        data: { 
          limit: '5',
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

  // 获取玩家名称
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
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

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
                        <View className="team-players">
                          <Text className="player-name winner-name">{getPlayerName(winnerP1)}</Text>
                          <Text className="player-plus">+</Text>
                          <Text className="player-name winner-name">{getPlayerName(winnerP2)}</Text>
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
                        <View className="team-players">
                          <Text className="player-name loser-name">{getPlayerName(loserP1)}</Text>
                          <Text className="player-plus">+</Text>
                          <Text className="player-name loser-name">{getPlayerName(loserP2)}</Text>
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
