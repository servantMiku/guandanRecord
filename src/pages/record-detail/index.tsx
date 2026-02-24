import { View, Text, Input } from '@tarojs/components'
import { useState, useEffect, useCallback } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Calendar, Edit, Save, ArrowLeft, History } from 'lucide-react'
import './index.css'

type Player = {
  id: string
  name: string
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
  editHistory: Array<{ timestamp: string; action: string; operator: string; details: any }>
  createdAt: string
  updatedAt: string
}

export default function RecordDetailPage() {
  const router = useRouter()
  const matchId = router.params.id

  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [editing, setEditing] = useState(false)
  const [editedScore, setEditedScore] = useState('')
  const [editedRemark, setEditedRemark] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      // 获取玩家列表
      const playerRes = await Network.request({
        url: '/api/players'
      })
      if (playerRes.data && playerRes.data.data) {
        setPlayers(playerRes.data.data)
      }

      // 获取战绩详情
      const matchRes = await Network.request({
        url: `/api/matches/${matchId}`
      })

      if (matchRes.data && matchRes.data.data) {
        setMatch(matchRes.data.data)
        setEditedScore(matchRes.data.data.score)
        setEditedRemark(matchRes.data.data.remark || '')
      }
    } catch (error) {
      console.error('获取数据失败:', error)
      Taro.showToast({ title: '获取数据失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    if (matchId) {
      fetchData()
    }
  }, [matchId, fetchData])

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name : playerId
  }

  const handleEdit = () => {
    setEditing(true)
  }

  const handleSave = async () => {
    if (!match) return

    try {
      await Network.request({
        url: `/api/matches/${match.id}`,
        method: 'PUT',
        data: {
          score: editedScore,
          remark: editedRemark
        }
      })

      Taro.showToast({ title: '保存成功', icon: 'success' })
      setEditing(false)
      fetchData()
    } catch (error) {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    }
  }

  const handleCancel = () => {
    if (match) {
      setEditedScore(match.score)
      setEditedRemark(match.remark || '')
    }
    setEditing(false)
  }

  const handleBack = () => {
    Taro.navigateBack()
  }

  if (loading) {
    return (
      <View className="detail-page">
        <View className="loading-container">
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    )
  }

  if (!match) {
    return (
      <View className="detail-page">
        <View className="empty-container">
          <Text className="empty-text">战绩不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="detail-page">
      {/* 头部导航 */}
      <View className="header">
        <View onClick={handleBack}>
          <ArrowLeft size={24} color="#ffffff" />
        </View>
        <Text className="header-title">战绩详情</Text>
        {!editing && (
          <View onClick={handleEdit}>
            <Edit size={24} color="#f472b6" />
          </View>
        )}
        {editing && (
          <View onClick={handleSave}>
            <Save size={24} color="#22c55e" />
          </View>
        )}
      </View>

      <View className="content">
        {/* 基本信息 */}
        <View className="card">
          <View className="card-header">
            <Calendar size={20} color="#fbbf24" />
            <Text className="card-date">
              {new Date(match.createdAt).toLocaleString()}
            </Text>
          </View>

          {/* 队伍1 */}
          <View className={`team-card ${match.winnerTeam === 1 ? 'team-card-winner' : ''}`}>
            <Text className="team-title team-title-1">队伍 1</Text>
            <View className="team-players">
              <View className="team-player">
                <View className="player-avatar avatar-1">
                  <Text className="avatar-text">{getPlayerName(match.team1Player1Id).charAt(0)}</Text>
                </View>
                <Text className="player-name">{getPlayerName(match.team1Player1Id)}</Text>
              </View>
              <Text className="plus-sign">+</Text>
              <View className="team-player">
                <View className="player-avatar avatar-1">
                  <Text className="avatar-text">{getPlayerName(match.team1Player2Id).charAt(0)}</Text>
                </View>
                <Text className="player-name">{getPlayerName(match.team1Player2Id)}</Text>
              </View>
            </View>
            {match.winnerTeam === 1 && (
              <Text className="winner-badge">🏆 获胜队伍</Text>
            )}
          </View>

          {/* 队伍2 */}
          <View className={`team-card ${match.winnerTeam === 2 ? 'team-card-winner' : ''}`}>
            <Text className="team-title team-title-2">队伍 2</Text>
            <View className="team-players">
              <View className="team-player">
                <View className="player-avatar avatar-2">
                  <Text className="avatar-text">{getPlayerName(match.team2Player1Id).charAt(0)}</Text>
                </View>
                <Text className="player-name">{getPlayerName(match.team2Player1Id)}</Text>
              </View>
              <Text className="plus-sign">+</Text>
              <View className="team-player">
                <View className="player-avatar avatar-2">
                  <Text className="avatar-text">{getPlayerName(match.team2Player2Id).charAt(0)}</Text>
                </View>
                <Text className="player-name">{getPlayerName(match.team2Player2Id)}</Text>
              </View>
            </View>
            {match.winnerTeam === 2 && (
              <Text className="winner-badge">🏆 获胜队伍</Text>
            )}
          </View>
        </View>

        {/* 比分 */}
        <View className="card">
          <Text className="section-title">比分</Text>
          {editing ? (
            <View className="input-wrapper">
              <Input
                className="score-input"
                value={editedScore}
                onInput={(e) => setEditedScore(e.detail.value)}
                placeholder="请输入比分，如：A1:J"
              />
            </View>
          ) : (
            <Text className="score-display">{match.score}</Text>
          )}
        </View>

        {/* 备注 */}
        <View className="card">
          <Text className="section-title">备注</Text>
          {editing ? (
            <View className="input-wrapper">
              <Input
                className="remark-input"
                value={editedRemark}
                onInput={(e) => setEditedRemark(e.detail.value)}
                placeholder="添加备注信息..."
              />
            </View>
          ) : (
            <Text className={`remark-display ${match.remark ? '' : 'remark-empty'}`}>
              {match.remark || '暂无备注'}
            </Text>
          )}
        </View>

        {/* 编辑历史 */}
        {match.editHistory && match.editHistory.length > 0 && (
          <View className="card">
            <View className="history-header">
              <History size={20} color="#fbbf24" />
              <Text className="section-title">编辑历史</Text>
            </View>
            <View className="history-list">
              {match.editHistory.map((history, index) => (
                <View key={index} className="history-item">
                  <Text className="history-time">
                    {new Date(history.timestamp).toLocaleString()}
                  </Text>
                  <Text className="history-action">{history.action}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 取消编辑按钮 */}
        {editing && (
          <View className="cancel-btn" onClick={handleCancel}>
            <Text className="cancel-btn-text">取消编辑</Text>
          </View>
        )}
      </View>
    </View>
  )
}
