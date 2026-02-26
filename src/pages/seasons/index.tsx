import { View, Text, Input, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import './index.css'

// 图标组件 - 使用 Unicode 字符
const Icon = ({ name, size = 24, color }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    Plus: '＋',
    Calendar: '📅',
    X: '✕',
    Trophy: '🏆',
    Clock: '⏰',
    Edit: '✎',
    CheckCircle: '✓',
  }
  return (
    <Text style={{ fontSize: `${size}px`, color, lineHeight: 1 }}>{icons[name] || '•'}</Text>
  )
}

type Season = {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: 'active' | 'ended'
  createdAt: string
}

type SeasonForm = {
  name: string
  startDate: string
  endDate: string | null
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)
  const [form, setForm] = useState<SeasonForm>({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: null
  })

  const fetchSeasons = async () => {
    try {
      const res = await Network.request({
        url: '/api/seasons'
      })
      if (res.data && res.data.data) {
        setSeasons(res.data.data)
      }
    } catch (error) {
      console.error('获取赛季列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeasons()
  }, [])

  // 页面显示时刷新数据
  useDidShow(() => {
    fetchSeasons()
  })

  const handleCreate = () => {
    setEditingSeason(null)
    setForm({
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: null
    })
    setShowForm(true)
  }

  const handleEdit = (season: Season) => {
    setEditingSeason(season)
    setForm({
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    // 验证表单
    if (!form.name.trim()) {
      Taro.showToast({ title: '请输入赛季名称', icon: 'none' })
      return
    }

    if (!form.startDate) {
      Taro.showToast({ title: '请选择开始日期', icon: 'none' })
      return
    }

    // 如果是新赛季且没有设置结束日期，检查是否已有活跃赛季
    const hasActiveSeason = seasons.some(s => s.status === 'active')
    if (!editingSeason && !form.endDate && hasActiveSeason) {
      Taro.showToast({ title: '已有活跃赛季，请先结束', icon: 'none' })
      return
    }

    try {
      if (editingSeason) {
        // 编辑赛季
        await Network.request({
          url: `/api/seasons/${editingSeason.id}`,
          method: 'PUT',
          data: {
            name: form.name,
            startDate: form.startDate,
            endDate: form.endDate
          }
        })
        Taro.showToast({ title: '更新成功', icon: 'success' })
      } else {
        // 创建赛季
        await Network.request({
          url: '/api/seasons',
          method: 'POST',
          data: {
            name: form.name,
            startDate: form.startDate,
            endDate: form.endDate
          }
        })
        Taro.showToast({ title: '创建成功', icon: 'success' })
      }

      setShowForm(false)
      fetchSeasons()
    } catch (error) {
      console.error('提交失败:', error)
      Taro.showToast({ title: '提交失败', icon: 'none' })
    }
  }

  const handleDelete = async (seasonId: string) => {
    try {
      const res = await Taro.showModal({
        title: '确认删除',
        content: '确定要删除这个赛季吗？删除后无法恢复'
      })

      if (res.confirm) {
        await Network.request({
          url: `/api/seasons/${seasonId}`,
          method: 'DELETE'
        })
        Taro.showToast({ title: '删除成功', icon: 'success' })
        fetchSeasons()
      }
    } catch (error) {
      console.error('删除失败:', error)
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  const handleEndSeason = async (season: Season) => {
    const today = new Date().toISOString().split('T')[0]
    const { confirm } = await Taro.showModal({
      title: '结束赛季',
      content: `确定要结束"${season.name}"吗？结束日期将设为今天(${today})`,
      confirmText: '确认结束',
      confirmColor: '#f59e0b'
    })

    if (confirm) {
      try {
        await Network.request({
          url: `/api/seasons/${season.id}/end`,
          method: 'PUT',
          data: { endDate: today }
        })
        Taro.showToast({ title: '赛季已结束', icon: 'success' })
        fetchSeasons()
      } catch (error) {
        console.error('结束赛季失败:', error)
        Taro.showToast({ title: '结束赛季失败', icon: 'none' })
      }
    }
  }

  const handleStartDateChange = (e: any) => {
    setForm({ ...form, startDate: e.detail.value })
  }

  const handleEndDateChange = (e: any) => {
    setForm({ ...form, endDate: e.detail.value || null })
  }

  const handleClearEndDate = () => {
    setForm({ ...form, endDate: null })
  }

  const activeSeasons = seasons.filter(s => s.status === 'active')
  const endedSeasons = seasons.filter(s => s.status === 'ended')

  return (
    <View className="seasons-page">
      {/* 头部 */}
      <View className="header">
        <Text className="header-title">赛季管理</Text>
        <View className="create-btn" onClick={handleCreate}>
          <Icon name="Plus" size={20} color="#ffffff" />
          <Text className="create-btn-text">新建</Text>
        </View>
      </View>

      {showForm && (
        <View className="form-container">
          <View className="form-card">
            <Text className="form-title">{editingSeason ? '编辑赛季' : '新建赛季'}</Text>

            {/* 赛季名称 */}
            <View className="form-field">
              <Text className="form-label">赛季名称</Text>
              <Input
                className="form-input"
                placeholder="例如：2024年春季赛"
                value={form.name}
                onInput={(e) => setForm({ ...form, name: e.detail.value })}
              />
            </View>

            {/* 开始日期 */}
            <View className="form-field">
              <Text className="form-label">📅 开始日期</Text>
              <Picker mode="date" value={form.startDate} onChange={handleStartDateChange}>
                <View className="date-picker">
                  <Text className="date-text">{form.startDate}</Text>
                  <Icon name="Calendar" size={24} color="#f472b6" />
                </View>
              </Picker>
            </View>

            {/* 结束日期 */}
            <View className="form-field">
              <Text className="form-label">🏁 结束日期 (可选)</Text>
              <View className="date-picker-row">
                <Picker mode="date" value={form.endDate || ''} onChange={handleEndDateChange}>
                  <View className={`date-picker ${form.endDate ? '' : 'date-picker-empty'}`}>
                    <Text className={`date-text ${form.endDate ? '' : 'date-text-empty'}`}>
                      {form.endDate || '点击选择日期'}
                    </Text>
                    <Icon name="Calendar" size={24} color="#f472b6" />
                  </View>
                </Picker>
                {form.endDate && (
                  <View className="clear-date-btn" onClick={handleClearEndDate}>
                    <Icon name="X" size={20} color="#ffffff" />
                  </View>
                )}
              </View>
              {!form.endDate && (
                <View className="status-badge status-active">
                  <Icon name="Clock" size={16} color="#22c55e" />
                  <Text className="status-text">赛季进行中</Text>
                </View>
              )}
              {form.endDate && (
                <View className="status-badge status-ended">
                  <Icon name="Trophy" size={16} color="#f59e0b" />
                  <Text className="status-text">已设置结束日期</Text>
                </View>
              )}
            </View>

            {/* 按钮 */}
            <View className="form-actions">
              <View className="form-btn form-btn-cancel" onClick={() => setShowForm(false)}>
                <Text className="form-btn-text">取消</Text>
              </View>
              <View className="form-btn form-btn-submit" onClick={handleSubmit}>
                <Text className="form-btn-text">保存</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className="content">
        {/* 活跃赛季 */}
        {activeSeasons.length > 0 && (
          <View className="season-group">
            <Text className="group-title">进行中</Text>
            {activeSeasons.map((season) => (
              <View key={season.id} className="season-card season-card-active">
                <View className="season-header">
                  <Text className="season-name">{season.name}</Text>
                  <View className="season-badge season-badge-active">
                    <Text className="season-badge-text">进行中</Text>
                  </View>
                </View>
                <View className="season-date">
                  <Icon name="Calendar" size={20} color="#ffffff" />
                  <Text className="season-date-text">{season.startDate} - 进行中</Text>
                </View>
                <View className="season-actions">
                  <View
                    className="season-action season-action-end"
                    onClick={() => handleEndSeason(season)}
                  >
                    <Icon name="CheckCircle" size={20} color="#ffffff" />
                    <Text className="season-action-text">结束</Text>
                  </View>
                  <View
                    className="season-action"
                    onClick={() => handleEdit(season)}
                  >
                    <Icon name="Edit" size={20} color="#ffffff" />
                    <Text className="season-action-text">编辑</Text>
                  </View>
                  <View
                    className="season-action season-action-delete"
                    onClick={() => handleDelete(season.id)}
                  >
                    <Icon name="X" size={20} color="#ffffff" />
                    <Text className="season-action-text">删除</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 已结束赛季 */}
        {endedSeasons.length > 0 && (
          <View className="season-group">
            <Text className="group-title">已结束</Text>
            {endedSeasons.map((season) => (
              <View key={season.id} className="season-card season-card-ended">
                <View className="season-header">
                  <Text className="season-name season-name-ended">{season.name}</Text>
                  <View className="season-badge season-badge-ended">
                    <Text className="season-badge-text">已结束</Text>
                  </View>
                </View>
                <View className="season-date season-date-ended">
                  <Calendar size={20} color="rgba(255,255,255,0.7)" />
                  <Text className="season-date-text">{season.startDate} - {season.endDate}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {seasons.length === 0 && !loading && (
          <View className="empty-container">
            <Icon name="Calendar" size={64} color="rgba(255,255,255,0.2)" />
            <Text className="empty-text">暂无赛季</Text>
            <Text className="empty-hint">点击上方&quot;新建&quot;创建第一个赛季</Text>
          </View>
        )}
      </View>
    </View>
  )
}
