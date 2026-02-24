import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Plus, Calendar, CheckCircle, XCircle } from 'lucide-react'
import './index.css'

type Season = {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: string
  createdAt: string
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSeasons = async () => {
    try {
      const { data } = await Network.request({
        url: '/api/seasons'
      })

      if (data) {
        setSeasons(data)
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

  const handleCreateSeason = () => {
    // 使用 prompt 模拟输入（小程序端实际需要使用 Modal）
    const seasonName = prompt('请输入赛季名称，如：2024年第一季度')
    if (seasonName) {
      const create = async () => {
        try {
          const today = new Date().toISOString().split('T')[0]
          await Network.request({
            url: '/api/seasons',
            method: 'POST',
            data: {
              name: seasonName,
              startDate: today
            }
          })
          Taro.showToast({ title: '创建成功', icon: 'success' })
          fetchSeasons()
        } catch (error) {
          Taro.showToast({ title: '创建失败', icon: 'none' })
        }
      }
      create()
    }
  }

  const handleEndSeason = (seasonId: string, seasonName: string) => {
    Taro.showModal({
      title: '结束赛季',
      content: `确定要结束"${seasonName}"吗？结束后将无法录入新战绩。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const today = new Date().toISOString().split('T')[0]
            await Network.request({
              url: `/api/seasons/${seasonId}/end`,
              method: 'PUT',
              data: { endDate: today }
            })
            Taro.showToast({ title: '已结束赛季', icon: 'success' })
            fetchSeasons()
          } catch (error) {
            Taro.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  }

  const handleAddRecord = () => {
    if (!activeSeason) {
      Taro.showToast({ title: '请先创建活跃赛季', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: `/pages/record-form/index?seasonId=${activeSeason.id}` })
  }

  // 检查是否有活跃赛季
  const activeSeason = seasons.find(s => s.status === 'active')

  return (
    <View className="min-h-screen bg-stone-50">
      <View className="px-4 py-4">
        {/* 快捷操作 */}
        <View className="flex gap-3 mb-4">
          <View
            className="flex-1 bg-amber-500 rounded-xl py-3 flex items-center justify-center"
            onClick={handleCreateSeason}
          >
            <Plus size={20} color="#ffffff" />
            <Text className="text-white font-medium ml-2">创建赛季</Text>
          </View>
          {activeSeason && (
            <View
              className="flex-1 bg-green-500 rounded-xl py-3 flex items-center justify-center"
              onClick={handleAddRecord}
            >
              <Calendar size={20} color="#ffffff" />
              <Text className="text-white font-medium ml-2">录入战绩</Text>
            </View>
          )}
        </View>

        {/* 赛季列表 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="block text-lg font-semibold text-amber-950 mb-4">赛季列表</Text>

          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="block text-stone-400 text-sm">加载中...</Text>
            </View>
          ) : seasons.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-8">
              <Text className="block text-stone-400 text-base">暂无赛季</Text>
              <Text className="block text-stone-400 text-sm mt-1">点击上方按钮创建赛季</Text>
            </View>
          ) : (
            <View>
              {seasons.map((season) => (
                <View key={season.id} className="mb-4 last:mb-0">
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center">
                      {season.status === 'active' ? (
                        <CheckCircle size={20} color="#22c55e" />
                      ) : (
                        <XCircle size={20} color="#a8a29e" />
                      )}
                      <Text className="block text-lg font-semibold text-amber-950 ml-2">
                        {season.name}
                      </Text>
                    </View>
                    {season.status === 'active' && (
                      <Text
                        className="text-amber-500 text-sm"
                        onClick={() => handleEndSeason(season.id, season.name)}
                      >
                        结束赛季
                      </Text>
                    )}
                  </View>

                  <View className="pl-7">
                    <View className="flex items-center mb-2">
                      <Text className="block text-sm text-stone-400 mr-2">起止日期：</Text>
                      <Text className="block text-sm text-stone-700">
                        {season.startDate} - {season.endDate || '进行中'}
                      </Text>
                    </View>
                    <View className="flex items-center">
                      <Text className="block text-sm text-stone-400 mr-2">状态：</Text>
                      <Text
                        className={`text-sm ${
                          season.status === 'active' ? 'text-green-500' : 'text-stone-500'
                        }`}
                      >
                        {season.status === 'active' ? '进行中' : '已结束'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
