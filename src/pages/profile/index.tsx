import { View, Text, Input } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Edit, Save, X } from 'lucide-react'
import './index.css'

type Player = {
  id: string
  name: string
  avatar: string | null
  createdAt: string
}

type EditingPlayer = {
  id: string
  name: string
  avatar: string | null
}

export default function ProfilePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetchPlayers()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = (player: Player) => {
    setEditingPlayer(player)
    setEditingName(player.name)
  }

  const handleCancelEdit = () => {
    setEditingPlayer(null)
    setEditingName('')
  }

  const handleSaveEdit = async () => {
    if (!editingPlayer) return

    if (!editingName.trim()) {
      Taro.showToast({ title: '玩家名称不能为空', icon: 'none' })
      return
    }

    try {
      await Network.request({
        url: `/api/players/${editingPlayer.id}`,
        method: 'PUT',
        data: { name: editingName.trim() }
      })

      Taro.showToast({ title: '更新成功', icon: 'success' })
      setEditingPlayer(null)
      setEditingName('')
      fetchPlayers()
    } catch (error) {
      console.error('更新玩家失败:', error)
      Taro.showToast({ title: '更新失败', icon: 'none' })
    }
  }

  const getPlayerInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?'
  }

  const getAvatarColor = (index: number) => {
    const colors = [
      'from-pink-500 to-rose-600',
      'from-purple-500 to-indigo-600',
      'from-cyan-500 to-blue-600',
      'from-green-500 to-emerald-600',
      'from-amber-500 to-orange-600',
      'from-red-500 to-pink-600'
    ]
    return colors[index % colors.length]
  }

  return (
    <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 头部 */}
      <View className="bg-white/10 backdrop-blur-lg px-4 py-4 border-b border-white/20">
        <Text className="block text-white text-lg font-bold">玩家管理</Text>
        <Text className="block text-white/60 text-sm mt-1">管理6位好友的信息</Text>
      </View>

      <View className="px-4 py-4">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-white/60 text-base">加载中...</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {players.map((player, index) => (
              <View
                key={player.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
              >
                <View className="flex items-center">
                  {/* 头像 - 名字缩写 */}
                  <View
                    className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarColor(
                      index
                    )} flex items-center justify-center`}
                  >
                    <Text className="text-white text-2xl font-bold">
                      {getPlayerInitial(player.name)}
                    </Text>
                  </View>

                  {/* 玩家信息 */}
                  <View className="flex-1 ml-4">
                    {editingPlayer?.id === player.id ? (
                      <Input
                        className="bg-white/10 text-white rounded-lg px-3 py-2"
                        placeholder="输入玩家名称"
                        value={editingName}
                        onInput={(e) => setEditingName(e.detail.value)}
                      />
                    ) : (
                      <View>
                        <Text className="block text-white text-xl font-bold">{player.name}</Text>
                        <Text className="block text-white/60 text-sm mt-1">
                          玩家 {index + 1}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 编辑按钮 */}
                  <View className="flex gap-2">
                    {editingPlayer?.id === player.id ? (
                      <>
                        <View
                          className="bg-green-500/50 px-3 py-2 rounded-lg flex items-center"
                          onClick={handleSaveEdit}
                        >
                          <Save size={18} color="#ffffff" />
                        </View>
                        <View
                          className="bg-red-500/50 px-3 py-2 rounded-lg flex items-center"
                          onClick={handleCancelEdit}
                        >
                          <X size={18} color="#ffffff" />
                        </View>
                      </>
                    ) : (
                      <View
                        className="bg-white/20 px-3 py-2 rounded-lg flex items-center"
                        onClick={() => handleStartEdit(player)}
                      >
                        <Edit size={18} color="#ffffff" />
                      </View>
                    )}
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
