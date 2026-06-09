import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { getStoredUser } from '@/stores/authStore'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import './index.css'

// 图标组件 - 使用 Unicode 字符
const Icon = ({ name, size = 24, color }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    Trophy: '🏆',
    Calendar: '📅',
    Filter: '🔍',
    Trash2: '🗑',
    Edit: '✎',
  }
  return (
    <Text style={{ fontSize: `${size}px`, color, lineHeight: 1 }}>{icons[name] || '•'}</Text>
  )
}

type Season = {
  id: string
  name: string
  status: string
}

type Player = {
  id: string
  name: string
}

type Match = {
  id: string
  seasonId: string
  season_id: string
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
  created_at?: string
}

export default function RecordsPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const isAdmin = getStoredUser()?.role === 'admin'

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

  const fetchPlayers = async () => {
    try {
      const res = await Network.request({
        url: '/api/players'
      })
      if (res.data && res.data.data) {
        setPlayers(res.data.data)
      }
    } catch (error) {
      console.error('获取玩家列表失败:', error)
    }
  }

  const fetchMatches = async (seasonId: string) => {
    if (!seasonId) return

    try {
      setLoading(true)
      const res = await Network.request({
        url: `/api/matches?seasonId=${seasonId}`,
        method: 'GET'
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
    fetchPlayers()
  }, [])

  // 页面显示时刷新数据
  useDidShow(() => {
    fetchSeasons()
    fetchPlayers()
    if (selectedSeasonId) {
      fetchMatches(selectedSeasonId)
    }
  })

  useEffect(() => {
    if (selectedSeasonId) {
      fetchMatches(selectedSeasonId)
    }
  }, [selectedSeasonId])

  const handleDeleteMatch = async (matchId: string, event: any) => {
    event.stopPropagation()

    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条战绩吗？删除后可在后台恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({
              url: `/api/matches/${matchId}`,
              method: 'DELETE'
            })
            Taro.showToast({ title: '删除成功', icon: 'success' })
            if (selectedSeasonId) {
              fetchMatches(selectedSeasonId)
            }
          } catch (error) {
            console.error('删除战绩失败:', error)
            Taro.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }

  const handleEditMatch = (matchId: string, seasonId: string, event: any) => {
    event.stopPropagation()
    Taro.navigateTo({ url: `/pages/record-form/index?seasonId=${seasonId}&matchId=${matchId}` })
  }

  // 获取玩家对象
  const getPlayer = (playerId: string) => {
    return players.find(p => p.id === playerId) || null
  }

  // 获取玩家全名
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name : '未知'
  }

  // 解析比分
  const parseScore = (score: string | null | undefined) => {
    if (!score) return { team1: '?', team2: '?' }
    const match = score.match(/队伍1：(.+?)，队伍2：(.+)/)
    if (match) {
      return { team1: match[1], team2: match[2] }
    }
    return { team1: '?', team2: '?' }
  }

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
    <View className="records-page">
      {/* 赛季筛选 */}
      <View className="season-filter">
        <View className="filter-header">
          <Icon name="Filter" size={20} color="#f472b6" />
          <Text className="filter-title">筛选赛季</Text>
        </View>
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

      {/* 战绩列表 */}
      <View className="content">
        {loading ? (
          <View className="loading-container">
            <Text className="loading-text">加载中...</Text>
          </View>
        ) : matches.length === 0 ? (
          <View className="empty-container">
            <Icon name="Trophy" size={64} color="rgba(255,255,255,0.2)" />
            <Text className="empty-text">暂无战绩记录</Text>
            <Text className="empty-hint">选择一个赛季查看战绩</Text>
          </View>
        ) : (
          <View className="match-list">
            {matches.map((match, index) => {
              const score = parseScore(match.score)
              const isTeam1Win = (match.winner_team || match.winnerTeam) === 1
              
              // 计算场次序号：倒序列表中，总场数 - 当前索引 = 正序场次号
              const matchNumber = matches.length - index
              
              const winnerP1 = isTeam1Win ? (match.team1_player1_id || match.team1Player1Id) : (match.team2_player1_id || match.team2Player1Id)
              const winnerP2 = isTeam1Win ? (match.team1_player2_id || match.team1Player2Id) : (match.team2_player2_id || match.team2Player2Id)
              const loserP1 = isTeam1Win ? (match.team2_player1_id || match.team2Player1Id) : (match.team1_player1_id || match.team1Player1Id)
              const loserP2 = isTeam1Win ? (match.team2_player2_id || match.team2Player2Id) : (match.team1_player2_id || match.team1Player2Id)
              const winnerScore = isTeam1Win ? score.team1 : score.team2
              const loserScore = isTeam1Win ? score.team2 : score.team1

              return (
                <View key={match.id} className="match-card">
                  {/* 顶部：时间和操作按钮 */}
                  <View className="match-header">
                    <View className="match-date-wrapper">
                      <Icon name="Calendar" size={18} color="#fbbf24" />
                      <Text className="match-date">{formatDate(match.created_at || match.createdAt)}</Text>
                      <Text className="match-number">第{matchNumber}场</Text>
                    </View>
                    {isAdmin && (
                    <View className="match-actions">
                      <View
                        className="action-btn action-btn-edit"
                        onClick={(e) => handleEditMatch(match.id, match.season_id || match.seasonId, e)}
                      >
                        <Icon name="Edit" size={16} color="#ffffff" />
                      </View>
                      <View
                        className="action-btn action-btn-delete"
                        onClick={(e) => handleDeleteMatch(match.id, e)}
                      >
                        <Icon name="Trash2" size={16} color="#ffffff" />
                      </View>
                    </View>
                    )}
                  </View>

                  {/* 对战双方 */}
                  <View className="match-teams">
                    {/* 获胜方 */}
                    <View className="match-team winner-team">
                      <View className="team-avatars">
                        <View className="player-avatar-wrapper">
                            <PlayerAvatar player={getPlayer(winnerP1)} size={40} />
                            <Text className="avatar-name winner-name">{getPlayerName(winnerP1)}</Text>
                          </View>
                          <Text className="player-plus">+</Text>
                          <View className="player-avatar-wrapper">
                            <PlayerAvatar player={getPlayer(winnerP2)} size={40} />
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
                            <PlayerAvatar player={getPlayer(loserP1)} size={40} />
                            <Text className="avatar-name loser-name">{getPlayerName(loserP1)}</Text>
                          </View>
                          <Text className="player-plus">+</Text>
                          <View className="player-avatar-wrapper">
                            <PlayerAvatar player={getPlayer(loserP2)} size={40} />
                            <Text className="avatar-name loser-name">{getPlayerName(loserP2)}</Text>
                          </View>
                      </View>
                      <View className="team-score loser-score">
                        <Text className="score-text">{loserScore}</Text>
                      </View>
                    </View>
                  </View>

                  {/* 备注 */}
                  {match.remark && (
                    <View className="match-remark-wrapper">
                      <Text className="match-remark">{match.remark}</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}
