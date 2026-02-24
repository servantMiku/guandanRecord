import { View, Text, Picker, Input } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Users, Calendar, Save, ArrowLeft } from 'lucide-react'
import './index.css'

type Player = {
  id: string
  name: string
}

type Season = {
  id: string
  name: string
  status: string
}

type TeamMember = {
  id: string
  name: string
  index: number
}

export default function RecordFormPage() {
  const router = useRouter()
  const seasonId = router.params.seasonId

  const [seasons, setSeasons] = useState<Season[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasonId || '')
  const [team1Players, setTeam1Players] = useState<TeamMember[]>([
    { id: '', name: '', index: 0 },
    { id: '', name: '', index: 1 }
  ])
  const [team2Players, setTeam2Players] = useState<TeamMember[]>([
    { id: '', name: '', index: 0 },
    { id: '', name: '', index: 1 }
  ])
  const [winnerTeam, setWinnerTeam] = useState<1 | 2>(1)
  const [score, setScore] = useState('')
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      // 获取赛季列表
      const { data: seasonList } = await Network.request({
        url: '/api/seasons'
      })
      if (seasonList && seasonList.length > 0) {
        setSeasons(seasonList)
        if (!selectedSeasonId) {
          const activeSeason = seasonList.find((s: Season) => s.status === 'active')
          if (activeSeason) {
            setSelectedSeasonId(activeSeason.id)
          }
        }
      }

      // 获取玩家列表
      const { data: playerList } = await Network.request({
        url: '/api/players'
      })
      if (playerList) {
        setPlayers(playerList)
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePlayerSelect = (team: 1 | 2, playerIndex: number, value: string) => {
    const player = players.find(p => p.id === value)
    if (team === 1) {
      const newTeam = [...team1Players]
      newTeam[playerIndex] = { id: value, name: player?.name || '', index: playerIndex }
      setTeam1Players(newTeam)
    } else {
      const newTeam = [...team2Players]
      newTeam[playerIndex] = { id: value, name: player?.name || '', index: playerIndex }
      setTeam2Players(newTeam)
    }
  }

  const handleSubmit = async () => {
    // 验证
    if (!selectedSeasonId) {
      Taro.showToast({ title: '请选择赛季', icon: 'none' })
      return
    }

    if (team1Players.some(p => !p.id)) {
      Taro.showToast({ title: '请选择队伍1的2位玩家', icon: 'none' })
      return
    }

    if (team2Players.some(p => !p.id)) {
      Taro.showToast({ title: '请选择队伍2的2位玩家', icon: 'none' })
      return
    }

    // 检查是否有重复玩家
    const allSelectedPlayerIds = [...team1Players, ...team2Players].map(p => p.id)
    const uniquePlayerIds = new Set(allSelectedPlayerIds)
    if (uniquePlayerIds.size !== 4) {
      Taro.showToast({ title: '同一位玩家不能同时出现在两队', icon: 'none' })
      return
    }

    if (!score) {
      Taro.showToast({ title: '请输入比分', icon: 'none' })
      return
    }

    try {
      await Network.request({
        url: '/api/matches',
        method: 'POST',
        data: {
          seasonId: selectedSeasonId,
          team1Player1Id: team1Players[0].id,
          team1Player2Id: team1Players[1].id,
          team2Player1Id: team2Players[0].id,
          team2Player2Id: team2Players[1].id,
          winnerTeam,
          score,
          remark: remark || null
        }
      })

      Taro.showToast({ title: '录入成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('录入失败:', error)
      Taro.showToast({ title: '录入失败', icon: 'none' })
    }
  }

  const handleBack = () => {
    Taro.navigateBack()
  }

  const getAvailablePlayers = (team: 1 | 2, playerIndex: number) => {
    const selectedIds = [
      ...team1Players.filter((_, i) => !(team === 1 && i === playerIndex)).map(p => p.id),
      ...team2Players.filter((_, i) => !(team === 2 && i === playerIndex)).map(p => p.id)
    ]
    return players.filter(p => !selectedIds.includes(p.id))
  }

  if (loading) {
    return (
      <View className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Text className="block text-stone-400 text-sm">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-stone-50">
      {/* 头部导航 */}
      <View className="bg-white px-4 py-3 border-b border-stone-100 flex items-center">
        <View onClick={handleBack}>
          <ArrowLeft size={24} color="#78350f" />
        </View>
        <Text className="flex-1 text-center text-lg font-bold text-amber-950">录入战绩</Text>
        <View onClick={handleSubmit}>
          <Save size={24} color="#f59e0b" />
        </View>
      </View>

      <View className="px-4 py-4">
        {/* 选择赛季 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex items-center mb-3">
            <Calendar size={20} color="#a8a29e" />
            <Text className="block text-base font-medium text-amber-950 ml-2">选择赛季</Text>
          </View>
          <Picker
            mode="selector"
            range={seasons.map(s => s.name)}
            value={seasons.findIndex(s => s.id === selectedSeasonId)}
            onChange={(e) => setSelectedSeasonId(seasons[e.detail.value].id)}
          >
            <View className="bg-stone-50 rounded-lg px-4 py-3">
              <Text className="block text-base text-amber-950">
                {seasons.find(s => s.id === selectedSeasonId)?.name || '请选择赛季'}
              </Text>
            </View>
          </Picker>
        </View>

        {/* 队伍1 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex items-center justify-between mb-3">
            <View className="flex items-center">
              <Users size={20} color="#a8a29e" />
              <Text className="block text-base font-medium text-amber-950 ml-2">队伍 1</Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full text-sm ${
                winnerTeam === 1 ? 'bg-green-500 text-white' : 'bg-stone-100 text-stone-700'
              }`}
              onClick={() => setWinnerTeam(1)}
            >
              {winnerTeam === 1 ? '获胜' : '设为获胜'}
            </View>
          </View>

          <View className="space-y-3">
            {[0, 1].map((index) => (
              <View key={index}>
                <Text className="block text-sm text-stone-500 mb-2">玩家 {index + 1}</Text>
                <Picker
                  mode="selector"
                  range={getAvailablePlayers(1, index).map(p => p.name)}
                  onChange={(e) =>
                    handlePlayerSelect(1, index, getAvailablePlayers(1, index)[e.detail.value].id)
                  }
                >
                  <View className="bg-stone-50 rounded-lg px-4 py-3">
                    <Text className="block text-base text-amber-950">
                      {team1Players[index].name || '请选择玩家'}
                    </Text>
                  </View>
                </Picker>
              </View>
            ))}
          </View>
        </View>

        {/* 队伍2 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex items-center justify-between mb-3">
            <View className="flex items-center">
              <Users size={20} color="#a8a29e" />
              <Text className="block text-base font-medium text-amber-950 ml-2">队伍 2</Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full text-sm ${
                winnerTeam === 2 ? 'bg-green-500 text-white' : 'bg-stone-100 text-stone-700'
              }`}
              onClick={() => setWinnerTeam(2)}
            >
              {winnerTeam === 2 ? '获胜' : '设为获胜'}
            </View>
          </View>

          <View className="space-y-3">
            {[0, 1].map((index) => (
              <View key={index}>
                <Text className="block text-sm text-stone-500 mb-2">玩家 {index + 1}</Text>
                <Picker
                  mode="selector"
                  range={getAvailablePlayers(2, index).map(p => p.name)}
                  onChange={(e) =>
                    handlePlayerSelect(2, index, getAvailablePlayers(2, index)[e.detail.value].id)
                  }
                >
                  <View className="bg-stone-50 rounded-lg px-4 py-3">
                    <Text className="block text-base text-amber-950">
                      {team2Players[index].name || '请选择玩家'}
                    </Text>
                  </View>
                </Picker>
              </View>
            ))}
          </View>
        </View>

        {/* 比分 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <Text className="block text-sm text-stone-500 mb-2">比分</Text>
          <View className="bg-stone-50 rounded-lg px-4 py-3">
            <Input
              className="w-full bg-transparent text-lg font-bold text-amber-500"
              value={score}
              onInput={(e) => setScore(e.detail.value)}
              placeholder="请输入比分，如：A1:J"
            />
          </View>
        </View>

        {/* 备注 */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <Text className="block text-sm text-stone-500 mb-2">备注（可选）</Text>
          <View className="bg-stone-50 rounded-lg px-4 py-3">
            <Input
              className="w-full bg-transparent text-base text-stone-700"
              value={remark}
              onInput={(e) => setRemark(e.detail.value)}
              placeholder="请输入备注"
            />
          </View>
        </View>

        {/* 提交按钮 */}
        <View
          className="bg-amber-500 text-white rounded-xl py-3 flex items-center justify-center"
          onClick={handleSubmit}
        >
          <Save size={20} color="#ffffff" />
          <Text className="block text-base font-medium ml-2">提交战绩</Text>
        </View>
      </View>
    </View>
  )
}
