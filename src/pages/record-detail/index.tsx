import { View, Text, Input } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Calendar, Edit, Save, ArrowLeft } from 'lucide-react'
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

  const fetchData = async () => {
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
  }

  useEffect(() => {
    if (matchId) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

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
      <View className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Text className="block text-stone-400 text-sm">加载中...</Text>
      </View>
    )
  }

  if (!match) {
    return (
      <View className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Text className="block text-stone-400 text-base">战绩不存在</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-stone-50">
      {/* 头部导航 */}
      <View className="bg-white px-4 py-3 border-b border-stone-100 flex items-center">
        <View onClick={handleBack}>
          <ArrowLeft size={24} color="#78350f" />
        </View>
        <Text className="flex-1 text-center text-lg font-bold text-amber-950">战绩详情</Text>
        {!editing && (
          <View onClick={handleEdit}>
            <Edit size={24} color="#f59e0b" />
          </View>
        )}
        {editing && (
          <View onClick={handleSave}>
            <Save size={24} color="#f59e0b" />
          </View>
        )}
      </View>

      <View className="px-4 py-4">
        {/* 基本信息 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex items-center mb-4">
            <Calendar size={20} color="#a8a29e" />
            <Text className="block text-base text-stone-400 ml-2">
              {new Date(match.createdAt).toLocaleString()}
            </Text>
          </View>

          <View className="mb-4">
            <Text className="block text-sm text-stone-500 mb-2">队伍 1</Text>
            <View className="bg-stone-50 rounded-lg p-3">
              <Text className="block text-base font-medium text-amber-950">
                {getPlayerName(match.team1Player1Id)} + {getPlayerName(match.team1Player2Id)}
              </Text>
              {match.winnerTeam === 1 && (
                <Text className="block text-sm text-green-500 mt-1">获胜队伍</Text>
              )}
            </View>
          </View>

          <View className="mb-4">
            <Text className="block text-sm text-stone-500 mb-2">队伍 2</Text>
            <View className="bg-stone-50 rounded-lg p-3">
              <Text className="block text-base font-medium text-amber-950">
                {getPlayerName(match.team2Player1Id)} + {getPlayerName(match.team2Player2Id)}
              </Text>
              {match.winnerTeam === 2 && (
                <Text className="block text-sm text-amber-500 mt-1">获胜队伍</Text>
              )}
            </View>
          </View>
        </View>

        {/* 比分和备注 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <Text className="block text-sm text-stone-500 mb-2">比分</Text>
          {editing ? (
            <View className="bg-stone-50 rounded-lg px-4 py-3 mb-4">
              <Input
                className="w-full bg-transparent text-lg font-bold text-amber-500"
                value={editedScore}
                onInput={(e) => setEditedScore(e.detail.value)}
                placeholder="请输入比分，如：A1:J"
              />
            </View>
          ) : (
            <Text className="block text-2xl font-bold text-amber-500 mb-4">{match.score}</Text>
          )}

          <Text className="block text-sm text-stone-500 mb-2">备注</Text>
          {editing ? (
            <View className="bg-stone-50 rounded-lg px-4 py-3">
              <Input
                className="w-full bg-transparent text-base text-stone-700"
                value={editedRemark}
                onInput={(e) => setEditedRemark(e.detail.value)}
                placeholder="请输入备注（可选）"
              />
            </View>
          ) : (
            <Text className="block text-base text-stone-700">
              {match.remark || '无备注'}
            </Text>
          )}
        </View>

        {/* 编辑历史 */}
        {match.editHistory && match.editHistory.length > 0 && (
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="block text-sm text-stone-500 mb-3">编辑历史</Text>
            <View>
              {match.editHistory.map((history, index) => (
                <View key={index} className="mb-3 last:mb-0 pb-3 border-b border-stone-100 last:border-0">
                  <Text className="block text-xs text-stone-400 mb-1">
                    {new Date(history.timestamp).toLocaleString()}
                  </Text>
                  <Text className="block text-sm text-stone-700 mb-1">{history.action}</Text>
                  {history.details && (
                    <Text className="block text-xs text-stone-400">
                      {JSON.stringify(history.details)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 编辑模式下的操作按钮 */}
        {editing && (
          <View className="flex gap-3 mt-4 pt-4">
            <View className="flex-1">
              <View
                className="w-full bg-stone-100 text-stone-700 rounded-xl py-3 flex items-center justify-center"
                onClick={handleCancel}
              >
                <Text className="block text-base font-medium">取消</Text>
              </View>
            </View>
            <View className="flex-1">
              <View
                className="w-full bg-amber-500 text-white rounded-xl py-3 flex items-center justify-center"
                onClick={handleSave}
              >
                <Save size={18} color="#ffffff" />
                <Text className="block text-base font-medium ml-2">保存</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
