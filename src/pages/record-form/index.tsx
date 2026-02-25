import { View, Text, Input } from '@tarojs/components'
import { useState, useEffect, useCallback } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Users, Trophy, Save, ArrowLeft, X } from 'lucide-react'
import './index.css'

type Player = {
  id: string
  name: string
}

type Season = {
  id: string
  name: string
}

const RECORD_FORM_KEY = 'record_form_draft'

// 掼蛋牌级选项
const CARD_LEVELS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A1', 'A2', 'A3']

export default function RecordFormPage() {
  const router = useRouter()
  const { seasonId, matchId } = router.params

  const [season, setSeason] = useState<Season | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false) // 防重复提交
  const isEditMode = !!matchId // 是否为编辑模式

  // 表单状态
  const [team1Player1, setTeam1Player1] = useState<string>('')
  const [team1Player2, setTeam1Player2] = useState<string>('')
  const [team2Player1, setTeam2Player1] = useState<string>('')
  const [team2Player2, setTeam2Player2] = useState<string>('')
  const [team1Score, setTeam1Score] = useState<string>('')
  const [team2Score, setTeam2Score] = useState<string>('')
  const [remark, setRemark] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      if (seasonId) {
        const seasonRes = await Network.request({
          url: `/api/seasons/${seasonId}`
        })
        if (seasonRes.data && seasonRes.data.data) {
          setSeason(seasonRes.data.data)
        }
      }

      const playerRes = await Network.request({
        url: '/api/players'
      })
      if (playerRes.data && playerRes.data.data) {
        setPlayers(playerRes.data.data)
      }

      // 如果是编辑模式，加载战绩详情
      if (matchId) {
        await loadMatchDetail(matchId)
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [seasonId, matchId])

  const loadMatchDetail = async (id: string) => {
    try {
      const res = await Network.request({
        url: `/api/matches/${id}`
      })
      if (res.data && res.data.data) {
        const match = res.data.data
        setTeam1Player1(match.team1_player1_id)
        setTeam1Player2(match.team1_player2_id)
        setTeam2Player1(match.team2_player1_id)
        setTeam2Player2(match.team2_player2_id)

        // 解析比分（假设格式为 "X - Y"）
        const scores = match.score.split(' - ')
        if (scores.length === 2) {
          setTeam1Score(scores[0])
          setTeam2Score(scores[1])
        }

        setRemark(match.remark || '')
      }
    } catch (error) {
      console.error('加载战绩详情失败:', error)
    }
  }

  const loadDraft = () => {
    try {
      const draft = Taro.getStorageSync(RECORD_FORM_KEY)
      if (draft) {
        setTeam1Player1(draft.team1Player1 || '')
        setTeam1Player2(draft.team1Player2 || '')
        setTeam2Player1(draft.team2Player1 || '')
        setTeam2Player2(draft.team2Player2 || '')
        setTeam1Score(draft.team1Score || '')
        setTeam2Score(draft.team2Score || '')
        setRemark(draft.remark || '')
      }
    } catch (error) {
      console.error('加载草稿失败:', error)
    }
  }

  useEffect(() => {
    fetchData()
    // 只在新增模式时加载草稿
    if (!matchId) {
      loadDraft()
    }
  }, [fetchData, matchId])

  const saveDraft = () => {
    const draft = {
      team1Player1,
      team1Player2,
      team2Player1,
      team2Player2,
      team1Score,
      team2Score,
      remark
    }
    Taro.setStorageSync(RECORD_FORM_KEY, draft)
  }

  const clearDraft = () => {
    Taro.removeStorageSync(RECORD_FORM_KEY)
  }

  const handlePlayerClick = (playerId: string) => {
    // 检查玩家是否已被选择
    const selectedSlots = [
      { slot: 'team1Player1', value: team1Player1 },
      { slot: 'team1Player2', value: team1Player2 },
      { slot: 'team2Player1', value: team2Player1 },
      { slot: 'team2Player2', value: team2Player2 }
    ]

    const existingSlot = selectedSlots.find(s => s.value === playerId)

    if (existingSlot) {
      // 如果已选择，取消选择
      switch (existingSlot.slot) {
        case 'team1Player1':
          setTeam1Player1('')
          break
        case 'team1Player2':
          setTeam1Player2('')
          break
        case 'team2Player1':
          setTeam2Player1('')
          break
        case 'team2Player2':
          setTeam2Player2('')
          break
      }
      saveDraft()
      return
    }

    // 查找第一个空槽位
    const emptySlot = selectedSlots.find(s => !s.value)
    if (!emptySlot) {
      Taro.showToast({ title: '已选满4名玩家', icon: 'none' })
      return
    }

    // 分配到第一个空槽位
    switch (emptySlot.slot) {
      case 'team1Player1':
        setTeam1Player1(playerId)
        break
      case 'team1Player2':
        setTeam1Player2(playerId)
        break
      case 'team2Player1':
        setTeam2Player1(playerId)
        break
      case 'team2Player2':
        setTeam2Player2(playerId)
        break
    }
    saveDraft()
  }

  const clearPlayer = (slot: string) => {
    switch (slot) {
      case 'team1Player1':
        setTeam1Player1('')
        break
      case 'team1Player2':
        setTeam1Player2('')
        break
      case 'team2Player1':
        setTeam2Player1('')
        break
      case 'team2Player2':
        setTeam2Player2('')
        break
    }
    saveDraft()
  }

  const handleSubmit = async () => {
    // 防重复点击
    if (submitting) {
      return
    }

    // 验证
    if (!team1Player1 || !team1Player2 || !team2Player1 || !team2Player2) {
      Taro.showToast({ title: '请选择4名玩家', icon: 'none' })
      return
    }

    if (!team1Score || !team2Score) {
      Taro.showToast({ title: '请选择比分', icon: 'none' })
      return
    }

    // 检查是否有玩家重复
    const selectedPlayers = [team1Player1, team1Player2, team2Player1, team2Player2]
    const uniquePlayers = new Set(selectedPlayers)
    if (uniquePlayers.size !== 4) {
      Taro.showToast({ title: '每队2名玩家，不能重复', icon: 'none' })
      return
    }

    setSubmitting(true)

    try {
      // 确定获胜队伍（根据牌级索引，索引越大牌越大）
      const team1ScoreIndex = CARD_LEVELS.indexOf(team1Score)
      const team2ScoreIndex = CARD_LEVELS.indexOf(team2Score)
      const winnerTeam = team1ScoreIndex > team2ScoreIndex ? 1 : 2

      // 构造比分字符串
      const scoreStr = `队伍1：${team1Score}，队伍2：${team2Score}`

      if (isEditMode && matchId) {
        // 编辑模式
        await Network.request({
          url: `/api/matches/${matchId}`,
          method: 'PUT',
          data: {
            winnerTeam,
            score: scoreStr,
            remark: remark || null
          }
        })
        Taro.showToast({ title: '修改成功', icon: 'success' })
      } else {
        // 新增模式
        await Network.request({
          url: '/api/matches',
          method: 'POST',
          data: {
            seasonId: seasonId,
            team1Player1Id: team1Player1,
            team1Player2Id: team1Player2,
            team2Player1Id: team2Player1,
            team2Player2Id: team2Player2,
            winnerTeam,
            score: scoreStr,
            remark: remark || null
          }
        })
        Taro.showToast({ title: '录入成功', icon: 'success' })
        clearDraft()
      }

      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('提交失败:', error)
      Taro.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name : ''
  }

  const isPlayerSelected = (playerId: string) => {
    return [team1Player1, team1Player2, team2Player1, team2Player2].includes(playerId)
  }

  const getPlayerTeamColor = (playerId: string) => {
    if (team1Player1 === playerId || team1Player2 === playerId) {
      return 'player-selected-team1'
    }
    if (team2Player1 === playerId || team2Player2 === playerId) {
      return 'player-selected-team2'
    }
    return ''
  }

  return (
    <View className="record-form-page">
      {/* 头部 */}
      <View className="header">
        <ArrowLeft size={24} color="#ffffff" onClick={() => Taro.navigateBack()} />
        <Text className="header-title">{isEditMode ? '编辑战绩' : '录入战绩'}</Text>
        {season && (
          <Text className="header-season">{season.name}</Text>
        )}
      </View>

      {loading ? (
        <View className="loading-container">
          <Text className="loading-text">加载中...</Text>
        </View>
      ) : (
        <View className="content">
          {/* 玩家选择 - 平铺显示 */}
          <View className="card">
            <View className="card-header">
              <Users size={24} color="#f472b6" />
              <Text className="card-title">选择玩家</Text>
              <Text className="card-hint">点击选择/取消</Text>
            </View>

            {/* 玩家按钮网格 - 使用 flex 布局代替 grid */}
            <View className="player-grid">
              {players.map((player) => {
                const selected = isPlayerSelected(player.id)
                const colorClass = getPlayerTeamColor(player.id)

                return (
                  <View
                    key={player.id}
                    className={`player-btn ${selected ? colorClass : ''}`}
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <Text className={`player-name ${selected ? 'name-selected' : ''}`}>
                      {player.name}
                    </Text>
                  </View>
                )
              })}
            </View>

            {/* 队伍分配 */}
            <View className="teams-container">
              {/* 队伍1 */}
              <View className="team-card team-card-1">
                <Text className="team-title">队伍1 (粉色)</Text>
                <View className="team-players">
                  <View className="team-player">
                    <Text className="team-player-label">玩家1</Text>
                    <Text className="team-player-name">
                      {getPlayerName(team1Player1) || '-'}
                    </Text>
                    {team1Player1 && (
                      <View
                        className="clear-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearPlayer('team1Player1')
                        }}
                      >
                        <X size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>
                  <View className="team-player">
                    <Text className="team-player-label">玩家2</Text>
                    <Text className="team-player-name">
                      {getPlayerName(team1Player2) || '-'}
                    </Text>
                    {team1Player2 && (
                      <View
                        className="clear-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearPlayer('team1Player2')
                        }}
                      >
                        <X size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* 队伍2 */}
              <View className="team-card team-card-2">
                <Text className="team-title">队伍2 (蓝色)</Text>
                <View className="team-players">
                  <View className="team-player">
                    <Text className="team-player-label">玩家1</Text>
                    <Text className="team-player-name">
                      {getPlayerName(team2Player1) || '-'}
                    </Text>
                    {team2Player1 && (
                      <View
                        className="clear-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearPlayer('team2Player1')
                        }}
                      >
                        <X size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>
                  <View className="team-player">
                    <Text className="team-player-label">玩家2</Text>
                    <Text className="team-player-name">
                      {getPlayerName(team2Player2) || '-'}
                    </Text>
                    {team2Player2 && (
                      <View
                        className="clear-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearPlayer('team2Player2')
                        }}
                      >
                        <X size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 比分录入 */}
          <View className="card">
            <View className="card-header">
              <Trophy size={32} color="#fbbf24" />
              <Text className="card-title">比分录入（选择牌级）</Text>
            </View>

            {/* 队伍1比分 */}
            <View className="score-section">
              <Text className="score-label">队伍1 (粉色)</Text>
              <View className="score-options">
                {CARD_LEVELS.map((level) => (
                  <View
                    key={`t1-${level}`}
                    className={`score-option ${team1Score === level ? 'score-option-selected' : ''}`}
                    onClick={() => {
                      setTeam1Score(level)
                      saveDraft()
                    }}
                  >
                    <Text className="score-option-text">{level}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 队伍2比分 */}
            <View className="score-section">
              <Text className="score-label">队伍2 (蓝色)</Text>
              <View className="score-options">
                {CARD_LEVELS.map((level) => (
                  <View
                    key={`t2-${level}`}
                    className={`score-option ${team2Score === level ? 'score-option-selected' : ''}`}
                    onClick={() => {
                      setTeam2Score(level)
                      saveDraft()
                    }}
                  >
                    <Text className="score-option-text">{level}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 当前选择显示 */}
            <View className="score-display">
              <Text className="score-display-text">
                {team1Score || '?'} VS {team2Score || '?'}
              </Text>
            </View>
          </View>

          {/* 备注 */}
          <View className="card">
            <Text className="section-title">备注 (可选)</Text>
            <View className="input-wrapper">
              <Input
                className="remark-input"
                placeholder="添加备注信息..."
                value={remark}
                onInput={(e) => {
                  setRemark(e.detail.value)
                  saveDraft()
                }}
              />
            </View>
          </View>

          {/* 提交按钮 */}
          <View
            className={`submit-btn ${submitting ? 'submit-btn-disabled' : ''}`}
            onClick={handleSubmit}
          >
            <Save size={28} color="#ffffff" />
            <Text className="submit-btn-text">{submitting ? '保存中...' : '保存战绩'}</Text>
          </View>
        </View>
      )}
    </View>
  )
}
