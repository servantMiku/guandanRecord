import { View, Text, Input } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { User, Save, Info } from 'lucide-react'
import './index.css'

type Player = {
  id: string
  name: string
  createdAt: string
}

export default function ProfilePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

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

  useEffect(() => {
    fetchPlayers()
  }, [])

  const handleNameChange = (index: number, value: string) => {
    const newPlayers = [...players]
    newPlayers[index].name = value
    setPlayers(newPlayers)
  }

  const handleSave = async () => {
    try {
      for (const player of players) {
        await Network.request({
          url: `/api/players/${player.id}`,
          method: 'PUT',
          data: { name: player.name }
        })
      }

      Taro.showToast({ title: '保存成功', icon: 'success' })
      setEditing(false)
      fetchPlayers()
    } catch (error) {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    }
  }

  const handleEdit = () => {
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    fetchPlayers()
  }

  return (
    <View className="min-h-screen bg-stone-50">
      <View className="px-4 py-4">
        {/* 玩家管理 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex items-center justify-between mb-4">
            <View className="flex items-center">
              <User size={20} color="#f59e0b" />
              <Text className="block text-lg font-semibold text-amber-950 ml-2">玩家管理</Text>
            </View>
            {!editing && (
              <Text className="text-amber-500 text-sm" onClick={handleEdit}>
                编辑
              </Text>
            )}
          </View>

          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="block text-stone-400 text-sm">加载中...</Text>
            </View>
          ) : (
            <View>
              {players.map((player, index) => (
                <View key={player.id} className="flex items-center mb-3 last:mb-0">
                  <View className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                    <Text className="block text-amber-500 font-bold">{index + 1}</Text>
                  </View>
                  {editing ? (
                    <View className="flex-1 bg-stone-50 rounded-lg px-4 py-3">
                      <Input
                        className="w-full bg-transparent text-base text-amber-950"
                        value={player.name}
                        onInput={(e) => handleNameChange(index, e.detail.value)}
                        placeholder={`玩家 ${index + 1} 姓名`}
                      />
                    </View>
                  ) : (
                    <View className="flex-1">
                      <Text className="block text-base text-amber-950">{player.name}</Text>
                    </View>
                  )}
                </View>
              ))}

              {editing && (
                <View className="flex gap-3 mt-4 pt-4 border-t border-stone-100">
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
          )}
        </View>

        {/* 关于 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex items-center mb-3">
            <Info size={20} color="#a8a29e" />
            <Text className="block text-lg font-semibold text-amber-950 ml-2">关于</Text>
          </View>
          <View className="space-y-3">
            <View className="flex justify-between items-center py-2 border-b border-stone-100">
              <Text className="block text-stone-600 text-base">版本</Text>
              <Text className="block text-stone-400 text-base">1.0.0</Text>
            </View>
            <View className="flex justify-between items-center py-2 border-b border-stone-100">
              <Text className="block text-stone-600 text-base">游戏类型</Text>
              <Text className="block text-amber-500 text-base">掼蛋</Text>
            </View>
            <View className="flex justify-between items-center py-2">
              <Text className="block text-stone-600 text-base">玩家数量</Text>
              <Text className="block text-stone-400 text-base">6 人</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
