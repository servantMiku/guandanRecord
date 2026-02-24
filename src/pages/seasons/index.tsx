import { View, Text, Input } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Plus, Calendar, Edit, Check, X } from 'lucide-react'
import './index.css'

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

  const handleStartDateChange = () => {
    // 简化实现：使用系统默认日期选择器
    // 注意：小程序中应该使用 Taro.showModal 让用户输入日期
    Taro.showModal({
      title: '开始日期',
      content: '请输入开始日期（YYYY-MM-DD）',
      editable: true as any,
      placeholderText: form.startDate,
      success: (res: any) => {
        if (res.confirm && res.content) {
          setForm({ ...form, startDate: res.content })
        }
      }
    })
  }

  const handleEndDateInputDialog = () => {
    if (form.endDate) {
      // 取消结束日期
      setForm({ ...form, endDate: null })
    } else {
      Taro.showModal({
        title: '结束日期',
        content: '请输入结束日期（YYYY-MM-DD），留空表示赛季进行中',
        editable: true as any,
        placeholderText: new Date().toISOString().split('T')[0],
        success: (res: any) => {
          if (res.confirm) {
            setForm({ ...form, endDate: res.content || null })
          }
        }
      })
    }
  }

  const activeSeasons = seasons.filter(s => s.status === 'active')
  const endedSeasons = seasons.filter(s => s.status === 'ended')

  return (
    <View className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 头部 */}
      <View className="bg-white/10 backdrop-blur-lg px-4 py-4 border-b border-white/20 flex items-center justify-between">
        <Text className="block text-white text-lg font-bold">赛季管理</Text>
        <View
          className="bg-gradient-to-r from-pink-500 to-rose-600 px-4 py-2 rounded-lg flex items-center shadow-lg"
          onClick={handleCreate}
        >
          <Plus size={20} color="#ffffff" />
          <Text className="block text-white font-bold ml-2">新建</Text>
        </View>
      </View>

      {showForm && (
        <View className="px-4 py-4 bg-white/10 border-b border-white/20">
          <View className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <Text className="block text-white text-lg font-bold mb-4">
              {editingSeason ? '编辑赛季' : '新建赛季'}
            </Text>

            {/* 赛季名称 */}
            <View className="mb-4">
              <Text className="block text-white text-sm font-semibold mb-2">赛季名称</Text>
              <Input
                className="w-full bg-white/10 text-white rounded-lg px-4 py-3"
                placeholder="例如：2024年春季赛"
                value={form.name}
                onInput={(e) => setForm({ ...form, name: e.detail.value })}
              />
            </View>

            {/* 开始日期 */}
            <View className="mb-4">
              <Text className="block text-white text-sm font-semibold mb-2">开始日期</Text>
              <View
                className="bg-white/10 rounded-lg px-4 py-3 flex items-center justify-between"
                onClick={handleStartDateChange}
              >
                <Text className="block text-white">{form.startDate}</Text>
                <Calendar size={20} color="#f472b6" />
              </View>
            </View>

            {/* 结束日期 */}
            <View className="mb-4">
              <Text className="block text-white text-sm font-semibold mb-2">结束日期 (可选)</Text>
              <View
                className={`bg-white/10 rounded-lg px-4 py-3 flex items-center justify-between ${
                  form.endDate ? '' : 'border-2 border-dashed border-white/20'
                }`}
                onClick={handleEndDateInputDialog}
              >
                <Text className={`block ${form.endDate ? 'text-white' : 'text-white/40'}`}>
                  {form.endDate || '赛季进行中'}
                </Text>
                {form.endDate ? <X size={20} color="#ef4444" /> : <Check size={20} color="#22c55e" />}
              </View>
              {!form.endDate && activeSeasons.length > 0 && !editingSeason && (
                <Text className="block text-amber-400 text-xs mt-1">
                  ⚠️ 已有活跃赛季，建议先设置结束日期
                </Text>
              )}
            </View>

            {/* 按钮 */}
            <View className="flex gap-3">
              <View
                className="flex-1 bg-white/20 rounded-lg py-3 text-center"
                onClick={() => setShowForm(false)}
              >
                <Text className="block text-white font-medium">取消</Text>
              </View>
              <View
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg py-3 text-center"
                onClick={handleSubmit}
              >
                <Text className="block text-white font-bold">保存</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className="px-4 py-4">
        {/* 活跃赛季 */}
        {activeSeasons.length > 0 && (
          <View className="mb-6">
            <Text className="block text-white/60 text-sm font-semibold mb-3">进行中</Text>
            {activeSeasons.map((season) => (
              <View
                key={season.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-3 border border-pink-500/30"
              >
                <View className="flex items-center justify-between mb-2">
                  <Text className="block text-white text-lg font-bold">{season.name}</Text>
                  <View className="bg-gradient-to-r from-pink-500 to-rose-600 px-3 py-1 rounded-full">
                    <Text className="block text-white text-xs font-bold">进行中</Text>
                  </View>
                </View>
                <View className="flex items-center text-white/60 text-sm mb-3">
                  <Calendar size={16} className="mr-1" />
                  <Text>{season.startDate} - 进行中</Text>
                </View>
                <View className="flex gap-2">
                  <View
                    className="flex-1 bg-white/20 rounded-lg py-2 flex items-center justify-center"
                    onClick={() => handleEdit(season)}
                  >
                    <Edit size={16} color="#ffffff" />
                    <Text className="block text-white text-sm ml-1">编辑</Text>
                  </View>
                  <View
                    className="flex-1 bg-red-500/50 rounded-lg py-2 flex items-center justify-center"
                    onClick={() => handleDelete(season.id)}
                  >
                    <X size={16} color="#ffffff" />
                    <Text className="block text-white text-sm ml-1">删除</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 已结束赛季 */}
        {endedSeasons.length > 0 && (
          <View>
            <Text className="block text-white/60 text-sm font-semibold mb-3">已结束</Text>
            {endedSeasons.map((season) => (
              <View
                key={season.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-3 border border-white/20"
              >
                <View className="flex items-center justify-between mb-2">
                  <Text className="block text-white/80 text-lg font-bold">{season.name}</Text>
                  <View className="bg-white/20 px-3 py-1 rounded-full">
                    <Text className="block text-white/60 text-xs font-bold">已结束</Text>
                  </View>
                </View>
                <View className="flex items-center text-white/40 text-sm mb-3">
                  <Calendar size={16} className="mr-1" />
                  <Text>{season.startDate} - {season.endDate}</Text>
                </View>
                <View className="flex gap-2">
                  <View
                    className="flex-1 bg-white/20 rounded-lg py-2 flex items-center justify-center"
                    onClick={() => handleEdit(season)}
                  >
                    <Edit size={16} color="#ffffff" />
                    <Text className="block text-white/60 text-sm ml-1">编辑</Text>
                  </View>
                  <View
                    className="flex-1 bg-red-500/30 rounded-lg py-2 flex items-center justify-center"
                    onClick={() => handleDelete(season.id)}
                  >
                    <X size={16} color="#ffffff" />
                    <Text className="block text-white/60 text-sm ml-1">删除</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {seasons.length === 0 && !loading && (
          <View className="flex flex-col items-center justify-center py-20">
            <Calendar size={64} color="#ffffff/20" />
            <Text className="block text-white/60 text-base mt-4">暂无赛季</Text>
            <Text className="block text-white/40 text-sm mt-2">点击上方&quot;新建&quot;创建第一个赛季</Text>
          </View>
        )}
      </View>
    </View>
  )
}
