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
      <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Text className="block text-white/60 text-base">加载中...</Text>
      </View>
    )
  }

  if (!match) {
    return (
      <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Text className="block text-white/60 text-base">战绩不存在</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 头部导航 */}
      <View className="bg-white/10 backdrop-blur-lg px-4 py-4 border-b border-white/20 flex items-center">
        <View onClick={handleBack}>
          <ArrowLeft size={24} color="#ffffff" />
        </View>
        <Text className="flex-1 text-center text-lg font-bold text-white">战绩详情</Text>
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

      <View className="px-4 py-4">
        {/* 基本信息 */}
        <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
          <View className="flex items-center mb-4">
            <Calendar size={20} color="#fbbf24" />
            <Text className="block text-base text-white/60 ml-2">
              {new Date(match.createdAt).toLocaleString()}
            </Text>
          </View>

          {/* 队伍1 */}
          <View
            className={`rounded-xl p-4 mb-3 ${
              match.winnerTeam === 1
                ? 'bg-gradient-to-r from-pink-500/20 to-rose-600/20 border border-pink-500/30'
                : 'bg-white/5'
            }`}
          >
            <Text className="block text-pink-400 text-sm font-bold mb-2">队伍 1</Text>
            <View className="flex items-center justify-between">
              <View className="flex items-center gap-2">
                <View className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Text className="text-white text-lg font-bold">
                    {getPlayerName(match.team1Player1Id).charAt(0)}
                  </Text>
                </View>
                <Text className="block text-white text-lg font-medium">
                  {getPlayerName(match.team1Player1Id)}
                </Text>
              </View>
              <Text className="block text-white/60 text-xl">+</Text>
              <View className="flex items-center gap-2">
                <View className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Text className="text-white text-lg font-bold">
                    {getPlayerName(match.team1Player2Id).charAt(0)}
                  </Text>
                </View>
                <Text className="block text-white text-lg font-medium">
                  {getPlayerName(match.team1Player2Id)}
                </Text>
              </View>
            </View>
            {match.winnerTeam === 1 && (
              <Text className="block text-pink-400 text-sm font-bold mt-3">🏆 获胜队伍</Text>
            )}
          </View>

          {/* 队伍2 */}
          <View
            className={`rounded-xl p-4 ${
              match.winnerTeam === 2
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30'
                : 'bg-white/5'
            }`}
          >
            <Text className="block text-cyan-400 text-sm font-bold mb-2">队伍 2</Text>
            <View className="flex items-center justify-between">
              <View className="flex items-center gap-2">
                <View className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Text className="text-white text-lg font-bold">
                    {getPlayerName(match.team2Player1Id).charAt(0)}
                  </Text>
                </View>
                <Text className="block text-white text-lg font-medium">
                  {getPlayerName(match.team2Player1Id)}
                </Text>
              </View>
              <Text className="block text-white/60 text-xl">+</Text>
              <View className="flex items-center gap-2">
                <View className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Text className="text-white text-lg font-bold">
                    {getPlayerName(match.team2Player2Id).charAt(0)}
                  </Text>
                </View>
                <Text className="block text-white text-lg font-medium">
                  {getPlayerName(match.team2Player2Id)}
                </Text>
              </View>
            </View>
            {match.winnerTeam === 2 && (
              <Text className="block text-cyan-400 text-sm font-bold mt-3">🏆 获胜队伍</Text>
            )}
          </View>
        </View>

        {/* 比分 */}
        <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
          <Text className="block text-white/80 text-sm font-semibold mb-3">比分</Text>
          {editing ? (
            <View className="bg-white/10 rounded-lg px-4 py-3">
              <Input
                className="w-full bg-transparent text-2xl font-bold text-white"
                value={editedScore}
                onInput={(e) => setEditedScore(e.detail.value)}
                placeholder="请输入比分，如：A1:J"
              />
            </View>
          ) : (
            <Text className="block text-3xl font-bold text-white">{match.score}</Text>
          )}
        </View>

        {/* 备注 */}
        <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
          <Text className="block text-white/80 text-sm font-semibold mb-3">备注</Text>
          {editing ? (
            <View className="bg-white/10 rounded-lg px-4 py-3">
              <Input
                className="w-full bg-transparent text-white"
                value={editedRemark}
                onInput={(e) => setEditedRemark(e.detail.value)}
                placeholder="添加备注信息..."
              />
            </View>
          ) : (
            <Text className={`text-white/80 ${match.remark ? '' : 'italic'}`}>
              {match.remark || '暂无备注'}
            </Text>
          )}
        </View>

        {/* 编辑历史 */}
        {match.editHistory && match.editHistory.length > 0 && (
          <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <View className="flex items-center mb-3">
              <History size={20} color="#fbbf24" />
              <Text className="block text-white/80 text-sm font-semibold ml-2">编辑历史</Text>
            </View>
            <View className="space-y-2">
              {match.editHistory.map((history, index) => (
                <View key={index} className="bg-white/5 rounded-lg p-3">
                  <Text className="block text-white/60 text-xs mb-1">
                    {new Date(history.timestamp).toLocaleString()}
                  </Text>
                  <Text className="block text-white text-sm">{history.action}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 取消编辑按钮 */}
        {editing && (
          <View
            className="mt-4 bg-red-500/50 rounded-xl py-3 text-center"
            onClick={handleCancel}
          >
            <Text className="block text-white font-bold">取消编辑</Text>
          </View>
        )}
      </View>
    </View>
  )
}
