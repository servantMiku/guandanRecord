import { View, Text, Input, Button } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { getStoredUser, loginWithPassword, loginWithWechat, logout, UserInfo } from '@/stores/authStore'
import { PlayerAvatar } from '@/components/PlayerAvatar'
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
    User: '👤',
    Shield: '🛡',
  }
  return (
    <Text style={{ fontSize: `${size}px`, color, lineHeight: 1 }}>{icons[name] || '•'}</Text>
  )
}

type Player = {
  id: string
  name: string
  avatar: string | null
  created_at: string
  updated_at: string
  user_id: string | null
}

type EditingPlayer = {
  id: string
  name: string
  avatar: string | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(getStoredUser())
  const [showPasswordLogin, setShowPasswordLogin] = useState(false)
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [honorThreshold, setHonorThreshold] = useState(80)
  const [thresholdCalcMethod, setThresholdCalcMethod] = useState<'season_total' | 'avg_participation'>('season_total')
  const [thresholdLoading, setThresholdLoading] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isMyPlayer = (player: Player): boolean => {
    return !!user && player.user_id === user.id
  }

  const refreshUser = () => {
    setUser(getStoredUser())
  }

  useEffect(() => {
    fetchPlayers()
    fetchThreshold()
  }, [])

  // 页面显示时刷新数据
  useDidShow(() => {
    refreshUser()
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

  const handlePasswordLogin = async () => {
    if (!password.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    setLoginLoading(true)
    try {
      const result = await loginWithPassword(password.trim())
      if (result) {
        Taro.showToast({ title: '登录成功', icon: 'success' })
        setShowPasswordLogin(false)
        setPassword('')
        refreshUser()
        fetchPlayers()
      } else {
        Taro.showToast({ title: '密码错误', icon: 'none' })
      }
    } catch (error) {
      console.error('登录异常:', error)
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      setLoginLoading(false)
    }
  }

  const handleShowLoginForm = () => {
    setShowPasswordLogin(true)
  }

  // 微信用户登录
  const handleWechatLogin = async () => {
    Taro.showLoading({ title: '登录中...' })
    const result = await loginWithWechat()
    Taro.hideLoading()
    if (result) {
      Taro.showToast({ title: '登录成功', icon: 'success' })
      refreshUser()
      fetchPlayers()
    } else {
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出当前账户吗？',
      success: (res) => {
        if (res.confirm) {
          logout()
          setUser(null)
          setShowPasswordLogin(false)
          setPassword('')
          Taro.showToast({ title: '已退出', icon: 'success' })
        }
      }
    })
  }


  const handleCancelAddPlayer = () => {
    setShowAddInput(false)
    setNewPlayerName('')
  }

  const fetchThreshold = async () => {
    try {
      const res = await Network.request({
        url: '/api/config/honor_threshold'
      })
      if (res.data && res.data.data) {
        const configValue = Number(res.data.data.value)
        if (!Number.isNaN(configValue)) {
          setHonorThreshold(configValue)
        }
      }
    } catch (error) {
      console.log('获取门槛配置失败:', error)
    }

    // 获取门槛计算方式
    try {
      const methodRes = await Network.request({
        url: '/api/config/threshold_calc_method'
      })
      if (methodRes.data && methodRes.data.data) {
        const method = methodRes.data.data.value
        if (method === 'avg_participation' || method === 'season_total') {
          setThresholdCalcMethod(method)
        }
      }
    } catch (error) {
      console.log('获取门槛计算方式失败:', error)
    }
  }

  const handleThresholdChange = (value: number) => {
    setHonorThreshold(value)
  }

  const handleSaveThreshold = async () => {
    try {
      setThresholdLoading(true)
      const res = await Network.request({
        url: '/api/config',
        method: 'POST',
        data: {
          key: 'honor_threshold',
          value: honorThreshold.toString(),
          description: '荣誉门槛百分比'
        }
      })
      if (res.data && res.data.code === 200) {
        // 保存门槛计算方式
        await Network.request({
          url: '/api/config',
          method: 'POST',
          data: {
            key: 'threshold_calc_method',
            value: thresholdCalcMethod,
            description: '荣誉门槛计算方式'
          }
        })
        Taro.showToast({ title: '保存成功', icon: 'success' })
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
    } catch (error) {
      console.log('保存门槛配置失败:', error)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setThresholdLoading(false)
    }
  }

  // 绑定玩家（H5 直接绑定，无头像同步）
  const handleBind = async (playerId: string) => {
    if (!user) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '绑定中...' })
    try {
      const res = await Network.request({
        url: `/api/players/${playerId}/bind`,
        method: 'POST',
      })
      Taro.hideLoading()
      if (res.data?.code === 200) {
        Taro.showToast({ title: '绑定成功', icon: 'success' })
        fetchPlayers()
      } else {
        Taro.showToast({ title: res.data?.msg || '绑定失败', icon: 'none' })
      }
    } catch (error) {
      Taro.hideLoading()
      console.error('绑定玩家失败:', error)
      Taro.showToast({ title: '绑定失败', icon: 'none' })
    }
  }

  // 微信小程序绑定（带头像选择）
  const handleWechatBind = async (playerId: string, e: any) => {
    const avatarUrl = e.detail?.avatarUrl
    if (!avatarUrl || !user) return

    Taro.showLoading({ title: '绑定中...' })
    try {
      // 转换头像为 base64
      const fs = Taro.getFileSystemManager()
      const fileData = fs.readFileSync(avatarUrl, 'base64')
      const base64 = `data:image/jpeg;base64,${fileData}`

      const res = await Network.request({
        url: `/api/players/${playerId}/bind`,
        method: 'POST',
        data: { avatar: base64 },
      })
      Taro.hideLoading()
      if (res.data?.code === 200) {
        Taro.showToast({ title: '绑定成功', icon: 'success' })
        fetchPlayers()
      } else {
        Taro.showToast({ title: res.data?.msg || '绑定失败', icon: 'none' })
      }
    } catch (error) {
      Taro.hideLoading()
      console.error('绑定玩家失败:', error)
      Taro.showToast({ title: '绑定失败', icon: 'none' })
    }
  }

  // 解绑玩家
  const handleUnbind = async (playerId: string) => {
    Taro.showModal({
      title: '解除绑定',
      content: '确定要解除与这个玩家的绑定吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await Network.request({
            url: `/api/players/${playerId}/unbind`,
            method: 'POST',
          })
          if (result.data?.code === 200) {
            Taro.showToast({ title: '解绑成功', icon: 'success' })
            fetchPlayers()
          } else {
            Taro.showToast({ title: result.data?.msg || '解绑失败', icon: 'none' })
          }
        } catch (error) {
          console.error('解绑玩家失败:', error)
          Taro.showToast({ title: '解绑失败', icon: 'none' })
        }
      }
    })
  }

  // 选择并上传头像
  const pickAvatar = async (player: Player) => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const tempPath = res.tempFilePaths[0]

      let base64 = ''
      const env = Taro.getEnv()

      if (env === Taro.ENV_TYPE.WEAPP) {
        const fs = Taro.getFileSystemManager()
        const fileData = fs.readFileSync(tempPath, 'base64')
        base64 = `data:image/jpeg;base64,${fileData}`
      } else {
        // H5: tempPath is a blob URL
        const response = await fetch(tempPath)
        const blob = await response.blob()
        base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }

      Taro.showLoading({ title: '上传中...' })
      await Network.request({
        url: `/api/players/${player.id}`,
        method: 'PUT',
        data: { avatar: base64 },
      })
      Taro.hideLoading()

      Taro.showToast({ title: '头像已更新', icon: 'success' })
      fetchPlayers()
    } catch (error) {
      Taro.hideLoading()
      console.error('上传头像失败:', error)
      Taro.showToast({ title: '上传失败', icon: 'none' })
    }
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
          // 微信小程序：复制 JSON 文本到剪贴板
          Taro.setClipboardData({
            data: dataStr,
            success: () => {
              Taro.showModal({
                title: '导出成功',
                content: '数据已复制到剪贴板！\n\n📋 下一步操作：\n1. 打开微信聊天窗口\n2. 粘贴发送给文件传输助手或好友\n3. 需要恢复时，复制消息内容即可导入',
                showCancel: false,
                confirmText: '我知道了'
              })
            },
            fail: () => {
              Taro.showToast({ title: '复制失败', icon: 'none' })
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
        content: '操作步骤：\n\n1. 先复制微信聊天记录中的备份文本\n2. 点击下方按钮，粘贴到输入框\n3. 系统将自动识别并导入\n\n⚠️ 导入会覆盖当前数据，请确保已备份！',
        confirmText: '开始导入',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 提示用户复制剪贴板内容
            Taro.getClipboardData({
              success: async (clipboardRes) => {
                const clipboardText = clipboardRes.data
                if (!clipboardText || clipboardText.trim().length === 0) {
                  Taro.showModal({
                    title: '剪贴板为空',
                    content: '请先在微信中复制备份消息，然后再点击导入',
                    showCancel: false,
                    confirmText: '我知道了'
                  })
                  return
                }

                try {
                  Taro.showLoading({ title: '导入中...' })
                  const importData = JSON.parse(clipboardText)

                  await Network.request({
                    url: '/api/stats/import',
                    method: 'POST',
                    data: { data: importData }
                  })

                  Taro.hideLoading()
                  Taro.showToast({ title: '导入成功', icon: 'success' })
                  // 刷新页面数据
                  setTimeout(() => {
                    Taro.reLaunch({ url: '/pages/profile/index' })
                  }, 1500)
                } catch (error) {
                  Taro.hideLoading()
                  console.error('导入数据失败:', error)
                  Taro.showModal({
                    title: '导入失败',
                    content: '无法识别剪贴板内容。\n\n请确保：\n1. 已复制正确的备份消息\n2. 消息内容未被修改\n3. 格式为 JSON',
                    showCancel: false,
                    confirmText: '我知道了'
                  })
                }
              },
              fail: () => {
                Taro.showModal({
                  title: '无法读取剪贴板',
                  content: '请允许访问剪贴板权限，或手动复制备份消息后再导入',
                  showCancel: false,
                  confirmText: '我知道了'
                })
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
      {/* 头部 - 用户信息 */}
      <View className="header">
        {user ? (
          <View key="header-logged-in">
            <View className="header-user-row">
              <View className="header-avatar">
                <Text className="header-avatar-text">
                  {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View className="header-user-info">
                <Text className="header-title">{user.nickname || '微信用户'}</Text>
                <Text className={`header-role ${isAdmin ? 'role-admin' : 'role-user'}`}>
                  {isAdmin ? '管理员' : '普通用户'}
                </Text>
              </View>
            </View>
            <Text className="header-logout" onClick={handleLogout}>退出登录</Text>
          </View>
        ) : (
          <View key="header-not-logged-in">
            <Text className="header-title">未登录</Text>
            <Text className="header-subtitle">登录后可使用完整功能</Text>
          </View>
        )}
      </View>

      {/* 登录区域 — 非管理员用户可见 */}
      {!isAdmin && !showPasswordLogin && (
        <View className="login-section" key="login-section">
          {/* 微信用户登录：未登录时显示 */}
          {!user && Taro.getEnv() === Taro.ENV_TYPE.WEAPP && (
            <View className="login-btn login-btn-wechat" onClick={handleWechatLogin}>
              <Icon name="User" size={24} color="#ffffff" />
              <Text className="login-btn-text">微信用户登录</Text>
            </View>
          )}
          <View className="login-btn" onClick={handleShowLoginForm}>
            <Icon name="Shield" size={24} color="#ffffff" />
            <Text className="login-btn-text">{user ? '切换管理员账号' : '管理员登录'}</Text>
          </View>
        </View>
      )}

      {!isAdmin && showPasswordLogin && (
        <View className="login-section" key="login-form-section">
          <View className="login-form">
            <Input
              className="login-input"
              type="text"
              password
              placeholder="输入管理员密码"
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
            <View className="login-actions">
              <View className="login-btn login-btn-cancel" onClick={() => { setShowPasswordLogin(false); setPassword('') }}>
                <Text className="login-btn-text">取消</Text>
              </View>
              <View className="login-btn login-btn-submit" onClick={handlePasswordLogin}>
                <Text className="login-btn-text">{loginLoading ? '登录中...' : '登录'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className="content">
        {loading ? (
          <View className="loading-container">
            <Text className="loading-text">加载中...</Text>
          </View>
        ) : (
          <>
            {isAdmin && (
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
            )}

            <View className="player-list">
            {user && !isAdmin && (
              <View className="bind-hint">
                <View className="bind-hint-dot" />
                <Text className="bind-hint-text">点击玩家旁的"绑定"按钮，将微信账号与该玩家关联</Text>
              </View>
            )}
            {players.map((player, index) => (
              <View key={player.id} className={`player-card ${player.user_id ? 'player-card-bound' : ''}`}>
                <View className="player-info">
                  <View style={{ position: 'relative' }}>
                    <PlayerAvatar player={player} size={80} colorIndex={index} onClick={(isAdmin || isMyPlayer(player)) ? () => pickAvatar(player) : undefined} />
                    {(isAdmin || isMyPlayer(player)) && (
                      <View
                        style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid rgba(255,255,255,0.3)',
                        }}
                        onClick={() => pickAvatar(player)}
                      >
                        <Text style={{ color: '#fff', fontSize: '16px', lineHeight: 1 }}>📷</Text>
                      </View>
                    )}
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
                      <>
                        <Text className="player-name">{player.name}</Text>
                        {player.user_id && (
                          <View className="bound-status">
                            <View className="bound-dot" />
                            <Text className="bound-indicator">
                              已绑定{player.user_id === user?.id ? ' (我)' : ''}
                            </Text>
                          </View>
                        )}
                        {!player.user_id && !isAdmin && (
                          <Text className="unbound-indicator">未绑定</Text>
                        )}
                      </>
                    )}
                  </View>
                </View>

                {/* 操作按钮 */}
                {user && (
                <View className="player-actions">
                  {editingPlayer?.id === player.id ? (
                    <>
                      <View className="action-btn action-btn-save" onClick={handleSaveEdit}>
                        <Icon name="Save" size={18} color="#ffffff" />
                      </View>
                      <View className="action-btn action-btn-cancel" onClick={handleCancelEdit}>
                        <Icon name="X" size={18} color="#ffffff" />
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Admin 编辑 */}
                      {isAdmin && (
                        <View className="action-btn action-btn-edit" onClick={() => handleStartEdit(player)}>
                          <Icon name="Edit" size={18} color="#ffffff" />
                        </View>
                      )}

                      {/* 普通用户编辑自己的玩家 */}
                      {!isAdmin && isMyPlayer(player) && (
                        <View className="action-btn action-btn-edit" onClick={() => handleStartEdit(player)}>
                          <Icon name="Edit" size={18} color="#ffffff" />
                        </View>
                      )}

                      {/* Admin：绑定/解绑 */}
                      {isAdmin && player.user_id && (
                        <View className="action-btn action-btn-unbind" onClick={() => handleUnbind(player.id)}>
                          <Text style={{ color: '#fff', fontSize: '22px' }}>解绑</Text>
                        </View>
                      )}
                      {isAdmin && !player.user_id && (
                        <View className="action-btn action-btn-bind" onClick={() => handleBind(player.id)}>
                          <Icon name="User" size={18} color="#ffffff" />
                          <Text style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold' }}>绑定</Text>
                        </View>
                      )}

                      {/* 普通用户：绑定/解绑/状态 */}
                      {!isAdmin && isMyPlayer(player) && (
                        <View className="action-btn action-btn-unbind" onClick={() => handleUnbind(player.id)}>
                          <Text style={{ color: '#fff', fontSize: '22px' }}>解绑</Text>
                        </View>
                      )}
                      {!isAdmin && !isMyPlayer(player) && !player.user_id && (
                        Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? (
                          <Button openType="chooseAvatar" className="action-btn action-btn-bind" onChooseAvatar={(e: any) => handleWechatBind(player.id, e)}>
                            <Icon name="User" size={18} color="#ffffff" />
                            <Text style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold' }}>绑定</Text>
                          </Button>
                        ) : (
                          <View className="action-btn action-btn-bind" onClick={() => handleBind(player.id)}>
                            <Icon name="User" size={18} color="#ffffff" />
                            <Text style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold' }}>绑定</Text>
                          </View>
                        )
                      )}
                      {!isAdmin && !isMyPlayer(player) && player.user_id && (
                        <View className="bound-badge">
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: '20px' }}>已绑定</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
                )}
              </View>
            ))}
          </View>

        {isAdmin && (
        <View>
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

        {/* 荣誉门槛配置 */}
        <View className="threshold-section">
          <Text className="threshold-title">🎖️ 荣誉门槛</Text>

          {/* 门槛计算方式选择 */}
          <Text className="threshold-subtitle">计算方式</Text>
          <View className="threshold-method-toggle">
            <View
              className={`threshold-method-option ${thresholdCalcMethod === 'season_total' ? 'threshold-method-active' : ''}`}
              onClick={() => setThresholdCalcMethod('season_total')}
            >
              <Text className="threshold-method-text">赛季已发生场次</Text>
              <Text className="threshold-method-desc">基于当前赛季已进行的比赛场次计算</Text>
            </View>
            <View
              className={`threshold-method-option ${thresholdCalcMethod === 'avg_participation' ? 'threshold-method-active' : ''}`}
              onClick={() => setThresholdCalcMethod('avg_participation')}
            >
              <Text className="threshold-method-text">已参赛选手平均场次</Text>
              <Text className="threshold-method-desc">基于实际参赛选手的平均场次计算</Text>
            </View>
          </View>

          <Text className="threshold-desc">
            {thresholdCalcMethod === 'season_total'
              ? `参赛场次达到当前赛季已进行场次的 ${honorThreshold}% 才能参与荣誉评选`
              : `参赛场次达到已参赛选手平均参赛场次的 ${honorThreshold}% 才能参与荣誉评选`
            }
          </Text>
          <View className="threshold-control">
            <View
              className="threshold-btn"
              onClick={() => handleThresholdChange(Math.max(50, honorThreshold - 5))}
            >
              <Text className="threshold-btn-text">−</Text>
            </View>
            <Text className="threshold-value-display">{honorThreshold}%</Text>
            <View
              className="threshold-btn"
              onClick={() => handleThresholdChange(Math.min(100, honorThreshold + 5))}
            >
              <Text className="threshold-btn-text">+</Text>
            </View>
          </View>
          <Text className="threshold-hint">点击按钮调整门槛（50% - 100%）</Text>
          <View className="threshold-save-btn" onClick={handleSaveThreshold}>
            <Text className="threshold-save-text">
              {thresholdLoading ? '保存中...' : '💾 保存设置'}
            </Text>
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
        )}
        </>
      )}
      </View>
    </View>
  )
}
