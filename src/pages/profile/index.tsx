import { View, Text, Input } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import './index.css'

// 图标组件 - 使用 Unicode 字符
const Icon = ({ name, size = 24, color }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    Edit: '✎',
    Save: '✓',
    X: '✕',
    Trash2: '🗑',
  }
  return (
    <Text style={{ fontSize: `${size}px`, color, lineHeight: 1 }}>{icons[name] || '•'}</Text>
  )
}

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

  // 页面显示时刷新数据
  useDidShow(() => {
    fetchPlayers()
  })

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

  const handleClearAllData = () => {
    Taro.showModal({
      title: '危险操作',
      content: '确定要清空所有数据吗？这将删除所有战绩和赛季，且无法恢复！',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({
              url: '/api/matches/clear-all',
              method: 'POST'
            })
            Taro.showToast({ title: '数据已清空', icon: 'success' })
            fetchPlayers()
          } catch (error) {
            console.error('清空数据失败:', error)
            Taro.showToast({ title: '清空失败', icon: 'none' })
          }
        }
      }
    })
  }

  return (
    <View className="profile-page">
      {/* 头部 */}
      <View className="header">
        <Text className="header-title">玩家管理</Text>
        <Text className="header-subtitle">管理6位好友的信息</Text>
      </View>

      <View className="content">
        {loading ? (
          <View className="loading-container">
            <Text className="loading-text">加载中...</Text>
          </View>
        ) : (
          <View className="player-list">
            {players.map((player, index) => (
              <View key={player.id} className="player-card">
                <View className="player-info">
                  {/* 头像 - 名字缩写 */}
                  <View className={`avatar avatar-${index}`}>
                    <Text className="avatar-text">{getPlayerInitial(player.name)}</Text>
                  </View>

                  {/* 玩家信息 */}
                  <View className="player-details">
                    {editingPlayer?.id === player.id ? (
                      <Input
                        className="player-name-input"
                        placeholder="输入玩家名称"
                        value={editingName}
                        onInput={(e) => setEditingName(e.detail.value)}
                      />
                    ) : (
                      <Text className="player-name">{player.name}</Text>
                    )}
                  </View>
                </View>

                {/* 编辑按钮 */}
                <View className="player-actions">
                  {editingPlayer?.id === player.id ? (
                    <>
                      <View
                        className="action-btn action-btn-save"
                        onClick={handleSaveEdit}
                      >
                        <Icon name="Save" size={18} color="#ffffff" />
                      </View>
                      <View
                        className="action-btn action-btn-cancel"
                        onClick={handleCancelEdit}
                      >
                        <Icon name="X" size={18} color="#ffffff" />
                      </View>
                    </>
                  ) : (
                    <View
                      className="action-btn action-btn-edit"
                      onClick={() => handleStartEdit(player)}
                    >
                      <Icon name="Edit" size={18} color="#ffffff" />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 清空数据区域 */}
        <View className="clear-data-section">
          <Text className="clear-data-title">⚠️ 危险区域</Text>
          <Text className="clear-data-desc">清空所有战绩、赛季数据，从0开始</Text>
          <View className="clear-data-btn" onClick={handleClearAllData}>
            <Icon name="Trash2" size={28} color="#ffffff" />
            <Text className="clear-data-btn-text" style={{ marginLeft: '12px' }}>清空所有数据</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
