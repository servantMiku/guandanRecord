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
    Download: '⬇️',
    Upload: '⬆️',
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
  const [showAddInput, setShowAddInput] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')

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

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      Taro.showToast({ title: '玩家名称不能为空', icon: 'none' })
      return
    }

    try {
      await Network.request({
        url: '/api/players',
        method: 'POST',
        data: { name: newPlayerName.trim() }
      })

      Taro.showToast({ title: '添加成功', icon: 'success' })
      setShowAddInput(false)
      setNewPlayerName('')
      fetchPlayers()
    } catch (error) {
      console.error('添加玩家失败:', error)
      Taro.showToast({ title: '添加失败', icon: 'none' })
    }
  }

  const handleCancelAddPlayer = () => {
    setShowAddInput(false)
    setNewPlayerName('')
  }

  const getPlayerInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?'
  }

  // 导出所有数据
  const handleExportData = async () => {
    try {
      Taro.showLoading({ title: '导出中...' })
      const res = await Network.request({
        url: '/api/stats/export'
      })
      Taro.hideLoading()

      if (res.data?.code === 200 && res.data?.data) {
        const exportData = res.data.data
        const dataStr = JSON.stringify(exportData, null, 2)
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        const filename = `guandan_backup_${timestamp}.json`

        const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP

        if (isWeapp) {
          // 微信小程序导出文件 - 使用两种文件格式
          const fs = Taro.getFileSystemManager()
          
          // 保存为 .json 格式（用于导入时识别）
          const jsonFilePath = `${Taro.env.USER_DATA_PATH}/${filename}`
          fs.writeFileSync(jsonFilePath, dataStr, 'utf8')
          
          // 同时保存为 .txt 格式（方便微信打开和分享）
          const txtFilename = `guandan_backup_${timestamp}.txt`
          const txtFilePath = `${Taro.env.USER_DATA_PATH}/${txtFilename}`
          fs.writeFileSync(txtFilePath, dataStr, 'utf8')

          Taro.showModal({
            title: '导出成功',
            content: `数据已保存！\n\n📁 文件格式：\n• JSON 格式：${filename}\n• TXT 格式：${txtFilename}\n\n💡 使用建议：\n1. 点击"打开文件"查看和分享 TXT 版本\n2. 导入数据时选择 JSON 版本文件`,
            confirmText: '打开文件',
            cancelText: '关闭',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 尝试打开 TXT 格式文件（微信支持较好）
                Taro.openDocument({
                  filePath: txtFilePath,
                  showMenu: true,
                  success: () => {
                    console.log('TXT 文件打开成功')
                  },
                  fail: (err) => {
                    console.error('打开文件失败:', err)
                    // 如果打开失败，提供复制路径功能
                    Taro.showModal({
                      title: '提示',
                      content: `文件已保存：\n\nJSON 格式：${jsonFilePath}\n\nTXT 格式：${txtFilePath}\n\n在导入数据时，请选择 JSON 格式的文件。`,
                      confirmText: '复制JSON路径',
                      cancelText: '关闭',
                      success: (copyRes) => {
                        if (copyRes.confirm) {
                          Taro.setClipboardData({
                            data: jsonFilePath,
                            success: () => {
                              Taro.showToast({ title: '路径已复制', icon: 'success' })
                            }
                          })
                        }
                      }
                    })
                  }
                })
              }
            }
          })
        } else {
          // H5 端下载文件
          const blob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)

          Taro.showModal({
            title: '导出成功',
            content: `数据已保存为 ${filename}`,
            showCancel: false,
            confirmText: '我知道了'
          })
        }

        console.log('导出数据:', exportData)
      } else {
        Taro.showToast({ title: '导出失败', icon: 'none' })
      }
    } catch (error) {
      Taro.hideLoading()
      console.error('导出数据失败:', error)
      Taro.showToast({ title: '导出失败', icon: 'none' })
    }
  }

  // 导入数据
  const handleImportData = () => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP

    if (isWeapp) {
      // 微信小程序导入
      Taro.showModal({
        title: '导入数据',
        content: '请选择备份文件导入。这将覆盖当前所有数据，请确保已备份！',
        confirmText: '选择文件',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            Taro.chooseMessageFile({
              count: 1,
              type: 'file',
              extension: ['json'],
              success: async (fileRes) => {
                try {
                  Taro.showLoading({ title: '导入中...' })
                  const tempFilePath = fileRes.tempFiles[0].path
                  const fs = Taro.getFileSystemManager()
                  const dataContent = fs.readFileSync(tempFilePath, 'utf8')
                  const dataStr = typeof dataContent === 'string' ? dataContent : new TextDecoder().decode(dataContent)
                  const importData = JSON.parse(dataStr)

                  await Network.request({
                    url: '/api/stats/import',
                    method: 'POST',
                    data: { data: importData }
                  })

                  Taro.hideLoading()
                  Taro.showToast({ title: '导入成功', icon: 'success' })
                  fetchPlayers()
                } catch (error) {
                  Taro.hideLoading()
                  console.error('导入数据失败:', error)
                  Taro.showToast({ title: '导入失败，请检查文件格式', icon: 'none' })
                }
              },
              fail: () => {
                Taro.showToast({ title: '未选择文件', icon: 'none' })
              }
            })
          }
        }
      })
    } else {
      // H5 端导入 - 使用文件选择器
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        try {
          Taro.showLoading({ title: '导入中...' })
          const text = await file.text()
          const importData = JSON.parse(text)

          await Network.request({
            url: '/api/stats/import',
            method: 'POST',
            data: { data: importData }
          })

          Taro.hideLoading()
          Taro.showToast({ title: '导入成功', icon: 'success' })
          fetchPlayers()
        } catch (error) {
          Taro.hideLoading()
          console.error('导入数据失败:', error)
          Taro.showToast({ title: '导入失败，请检查文件格式', icon: 'none' })
        }
      }
      input.click()
    }
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
          <View>
            <View className="add-player-section">
              {showAddInput ? (
                <View className="add-player-input-container">
                  <View className="add-player-input-wrapper">
                    <Input
                      className="add-player-input"
                      placeholder="输入新玩家名称"
                      value={newPlayerName}
                      onInput={(e) => setNewPlayerName(e.detail.value)}
                    />
                  </View>
                  <View className="add-player-actions">
                    <View className="add-player-btn add-player-btn-confirm" onClick={handleAddPlayer}>
                      <Text className="add-player-btn-text">确认</Text>
                    </View>
                    <View className="add-player-btn add-player-btn-cancel" onClick={handleCancelAddPlayer}>
                      <Text className="add-player-btn-text">取消</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="add-player-btn add-player-btn-main" onClick={() => setShowAddInput(true)}>
                  <Text className="add-player-btn-icon">➕</Text>
                  <Text className="add-player-btn-text" style={{ marginLeft: '8px' }}>添加玩家</Text>
                </View>
              )}
            </View>

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
          </View>
        )}

        {/* 数据导出导入区域 */}
        <View className="data-backup-section">
          <Text className="data-backup-title">💾 数据备份</Text>
          <Text className="data-backup-desc">导出所有数据备份，或从备份文件恢复</Text>
          <View className="data-backup-btns">
            <View className="backup-btn backup-btn-export" onClick={handleExportData}>
              <Text className="backup-btn-icon">⬇️</Text>
              <Text className="backup-btn-text">导出数据</Text>
            </View>
            <View className="backup-btn backup-btn-import" onClick={handleImportData}>
              <Text className="backup-btn-icon">⬆️</Text>
              <Text className="backup-btn-text">导入数据</Text>
            </View>
          </View>
        </View>

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
