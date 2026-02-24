import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Plus, Edit, Trash2, Calendar } from 'lucide-react'
import './index.css'

type Season = {
  id: string
  name: string
}

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
  createdAt: string
  updatedAt: string
  isDeleted: boolean
  seasons?: Season
}

export default function RecordsPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<Player[]>([])

  const fetchData = async () => {
    try {
      // 获取玩家列表
      const playerRes = await Network.request({
        url: '/api/players'
      })
      if (playerRes.data && playerRes.data.data) {
        setPlayers(playerRes.data.data)
      }

      // 获取战绩列表
      const matchRes = await Network.request({
        url: '/api/matches'
      })
      if (matchRes.data && matchRes.data.data) {
        setMatches(matchRes.data.data)
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

  const handleAddRecord = () => {
    // 获取活跃赛季ID
    const activeSeasonId = matches.length > 0 && matches[0].seasonId
      ? matches[0].seasonId
      : ''
    Taro.navigateTo({ url: `/pages/record-form/index?seasonId=${activeSeasonId}` })
  }

  const handleEdit = (matchId: string) => {
    Taro.navigateTo({ url: `/pages/record-detail/index?id=${matchId}` })
  }

  const handleDelete = async (matchId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '删除后的战绩将无法恢复，是否继续？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({
              url: `/api/matches/${matchId}`,
              method: 'DELETE'
            })
            Taro.showToast({ title: '删除成功', icon: 'success' })
            fetchData()
          } catch (error) {
            Taro.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name : playerId
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <View className="min-h-screen bg-stone-50">
      {/* 添加按钮 */}
      <View className="px-4 py-4">
        <View
          className="bg-amber-500 rounded-xl py-3 flex items-center justify-center"
          onClick={handleAddRecord}
        >
          <Plus size={20} color="#ffffff" />
          <Text className="text-white font-medium ml-2">录入战绩</Text>
        </View>
      </View>

      {/* 战绩列表 */}
      <View className="px-4 pb-4">
        {loading ? (
          <View className="flex items-center justify-center py-16">
            <Text className="block text-stone-400 text-sm">加载中...</Text>
          </View>
        ) : matches.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-16">
            <Text className="block text-stone-400 text-base">暂无战绩记录</Text>
            <Text className="block text-stone-400 text-sm mt-1">点击上方按钮开始录入</Text>
          </View>
        ) : (
          <View>
            {matches.map((match) => (
              <View key={match.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                {/* 日期和赛季 */}
                <View className="flex items-center justify-between mb-3">
                  <View className="flex items-center">
                    <Calendar size={16} color="#a8a29e" />
                    <Text className="block text-sm text-stone-400 ml-2">
                      {formatDate(match.createdAt)}
                    </Text>
                  </View>
                  {match.seasons && (
                    <Text className="block text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded">
                      {match.seasons.name}
                    </Text>
                  )}
                </View>

                {/* 队伍1 */}
                <View className={`mb-3 ${match.winnerTeam === 1 ? 'bg-green-50 rounded-lg p-3' : ''}`}>
                  <Text className="block text-sm text-stone-500 mb-2">队伍 1</Text>
                  <View className="flex items-center justify-between">
                    <Text className="block text-base font-medium text-amber-950">
                      {getPlayerName(match.team1Player1Id)} + {getPlayerName(match.team1Player2Id)}
                    </Text>
                    {match.winnerTeam === 1 && (
                      <Text className="text-green-500 font-medium">获胜</Text>
                    )}
                  </View>
                </View>

                {/* 队伍2 */}
                <View className={`mb-3 ${match.winnerTeam === 2 ? 'bg-amber-50 rounded-lg p-3' : ''}`}>
                  <Text className="block text-sm text-stone-500 mb-2">队伍 2</Text>
                  <View className="flex items-center justify-between">
                    <Text className="block text-base font-medium text-amber-950">
                      {getPlayerName(match.team2Player1Id)} + {getPlayerName(match.team2Player2Id)}
                    </Text>
                    {match.winnerTeam === 2 && (
                      <Text className="text-amber-500 font-medium">获胜</Text>
                    )}
                  </View>
                </View>

                {/* 比分和备注 */}
                <View className="border-t border-stone-100 pt-3 flex items-center justify-between">
                  <View>
                    <Text className="block text-lg font-bold text-amber-500">{match.score}</Text>
                    {match.remark && (
                      <Text className="block text-sm text-stone-400 mt-1">{match.remark}</Text>
                    )}
                  </View>

                  {/* 操作按钮 */}
                  <View className="flex gap-3">
                    <View onClick={() => handleEdit(match.id)}>
                      <Edit size={18} color="#a8a29e" />
                    </View>
                    <View onClick={() => handleDelete(match.id)}>
                      <Trash2 size={18} color="#ef4444" />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
