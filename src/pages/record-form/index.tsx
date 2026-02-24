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

export default function RecordFormPage() {
  const router = useRouter()
  const { seasonId } = router.params

  const [season, setSeason] = useState<Season | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

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
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [seasonId])

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
    loadDraft()
  }, [fetchData])

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
    // 验证
    if (!team1Player1 || !team1Player2 || !team2Player1 || !team2Player2) {
      Taro.showToast({ title: '请选择4名玩家', icon: 'none' })
      return
    }

    if (!team1Score || !team2Score) {
      Taro.showToast({ title: '请输入比分', icon: 'none' })
      return
    }

    // 检查是否有玩家重复
    const selectedPlayers = [team1Player1, team1Player2, team2Player1, team2Player2]
    const uniquePlayers = new Set(selectedPlayers)
    if (uniquePlayers.size !== 4) {
      Taro.showToast({ title: '每队2名玩家，不能重复', icon: 'none' })
      return
    }

    try {
      // 确定获胜队伍
      const team1ScoreNum = parseInt(team1Score)
      const team2ScoreNum = parseInt(team2Score)
      const winnerTeam = team1ScoreNum > team2ScoreNum ? 1 : 2

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
          score: `队伍1：${team1Score}，队伍2：${team2Score}`,
          remark: remark || null
        }
      })

      clearDraft()
      Taro.showToast({ title: '录入成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('提交失败:', error)
      Taro.showToast({ title: '提交失败', icon: 'none' })
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
      return 'from-pink-500 to-rose-600 border-pink-400'
    }
    if (team2Player1 === playerId || team2Player2 === playerId) {
      return 'from-cyan-500 to-blue-600 border-cyan-400'
    }
    return ''
  }

  return (
    <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 头部 */}
      <View className="bg-white/10 backdrop-blur-lg px-4 py-4 border-b border-white/20 flex items-center">
        <ArrowLeft size={24} color="#ffffff" onClick={() => Taro.navigateBack()} />
        <Text className="block text-white text-lg font-bold ml-3">录入战绩</Text>
        {season && (
          <Text className="block text-pink-400 text-sm ml-auto">{season.name}</Text>
        )}
      </View>

      {loading ? (
        <View className="flex items-center justify-center py-20">
          <Text className="block text-white/60 text-base">加载中...</Text>
        </View>
      ) : (
        <View className="px-4 py-4 pb-8">
          {/* 玩家选择 - 平铺显示 */}
          <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
            <View className="flex items-center mb-4">
              <Users size={24} color="#f472b6" />
              <Text className="block text-white text-lg font-bold ml-2">选择玩家</Text>
              <Text className="block text-white/60 text-sm ml-auto">点击选择/取消</Text>
            </View>

            {/* 玩家按钮网格 */}
            <View className="grid grid-cols-3 gap-3">
              {players.map((player) => {
                const selected = isPlayerSelected(player.id)
                const colorClass = getPlayerTeamColor(player.id)

                return (
                  <View
                    key={player.id}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                      selected
                        ? `bg-gradient-to-br ${colorClass}`
                        : 'bg-white/10 border-white/20'
                    }`}
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <Text className={`text-3xl font-bold mb-1 ${selected ? 'text-white' : 'text-white/60'}`}>
                      {player.name.charAt(0)}
                    </Text>
                    <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-white/80'}`}>
                      {player.name}
                    </Text>
                  </View>
                )
              })}
            </View>

            {/* 队伍分配 */}
            <View className="mt-4 space-y-3">
              {/* 队伍1 */}
              <View className="bg-gradient-to-r from-pink-500/20 to-rose-600/20 rounded-xl p-3 border border-pink-500/30">
                <Text className="block text-pink-400 text-sm font-bold mb-2">队伍1 (粉色)</Text>
                <View className="flex gap-2">
                  <View className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-center relative">
                    <Text className="block text-white/60 text-xs mb-1">玩家1</Text>
                    <Text className="block text-white font-semibold">
                      {getPlayerName(team1Player1) || '-'}
                    </Text>
                    {team1Player1 && (
                      <View
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearPlayer('team1Player1')
                        }}
                      >
                        <X size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-center relative">
                    <Text className="block text-white/60 text-xs mb-1">玩家2</Text>
                    <Text className="block text-white font-semibold">
                      {getPlayerName(team1Player2) || '-'}
                    </Text>
                    {team1Player2 && (
                      <View
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
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
              <View className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-xl p-3 border border-cyan-500/30">
                <Text className="block text-cyan-400 text-sm font-bold mb-2">队伍2 (蓝色)</Text>
                <View className="flex gap-2">
                  <View className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-center relative">
                    <Text className="block text-white/60 text-xs mb-1">玩家1</Text>
                    <Text className="block text-white font-semibold">
                      {getPlayerName(team2Player1) || '-'}
                    </Text>
                    {team2Player1 && (
                      <View
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearPlayer('team2Player1')
                        }}
                      >
                        <X size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-center relative">
                    <Text className="block text-white/60 text-xs mb-1">玩家2</Text>
                    <Text className="block text-white font-semibold">
                      {getPlayerName(team2Player2) || '-'}
                    </Text>
                    {team2Player2 && (
                      <View
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
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
          <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
            <View className="flex items-center mb-4">
              <Trophy size={24} color="#fbbf24" />
              <Text className="block text-white text-lg font-bold ml-2">比分录入</Text>
            </View>

            <View className="flex items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="block text-pink-400 text-sm font-bold mb-2 text-center">队伍1</Text>
                <Input
                  className="w-full bg-white/10 text-white text-center rounded-lg px-4 py-3"
                  type="number"
                  placeholder="0"
                  value={team1Score}
                  onInput={(e) => {
                    setTeam1Score(e.detail.value)
                    saveDraft()
                  }}
                />
              </View>
              <Text className="block text-white/60 text-2xl font-bold">VS</Text>
              <View className="flex-1">
                <Text className="block text-cyan-400 text-sm font-bold mb-2 text-center">队伍2</Text>
                <Input
                  className="w-full bg-white/10 text-white text-center rounded-lg px-4 py-3"
                  type="number"
                  placeholder="0"
                  value={team2Score}
                  onInput={(e) => {
                    setTeam2Score(e.detail.value)
                    saveDraft()
                  }}
                />
              </View>
            </View>
          </View>

          {/* 备注 */}
          <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
            <Text className="block text-white text-base font-semibold mb-3">备注 (可选)</Text>
            <Input
              className="w-full bg-white/10 text-white rounded-lg px-4 py-3"
              placeholder="添加备注信息..."
              value={remark}
              onInput={(e) => {
                setRemark(e.detail.value)
                saveDraft()
              }}
            />
          </View>

          {/* 提交按钮 */}
          <View
            className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl py-4 flex items-center justify-center shadow-lg"
            onClick={handleSubmit}
          >
            <Save size={24} color="#ffffff" />
            <Text className="block text-white font-bold ml-2 text-lg">保存战绩</Text>
          </View>
        </View>
      )}
    </View>
  )
}
