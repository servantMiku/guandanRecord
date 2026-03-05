import { View, Text, Button } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import './index.css'

// 图标组件 - 使用 Unicode 字符
const Icon = ({ name, size = 24, color }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    Shuffle: '🔀',
    Refresh: '🔄',
    Users: '👥',
    Trophy: '🏆',
    Check: '✓',
    ArrowLeft: '←',
    Sparkles: '✨',
  }
  return (
    <Text style={{ fontSize: `${size}px`, color, lineHeight: 1 }}>{icons[name] || '•'}</Text>
  )
}

type Player = {
  id: string
  name: string
}

type Match = {
  id: string
  team1_player1_id: string
  team1_player2_id: string
  team2_player1_id: string
  team2_player2_id: string
}

type PlayerStats = {
  id: string
  name: string
  totalMatches: number
}

type PartnerStats = {
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  totalMatches: number
}

type TeamSuggestion = {
  player1: Player
  player2: Player
  avgMatches: number
  partnerHistory: number
}

type MatchSuggestion = {
  team1: TeamSuggestion
  team2: TeamSuggestion
  balanceScore: number
  diversityScore: number
}

export default function ArrangeMatchPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [partnerStats, setPartnerStats] = useState<PartnerStats[]>([])
  const [currentSeason, setCurrentSeason] = useState<{id: string; name: string} | null>(null)
  const [suggestion, setSuggestion] = useState<MatchSuggestion | null>(null)
  const [isRestored, setIsRestored] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // 获取玩家列表
      const playersRes = await Network.request({ url: '/api/players' })
      const playerList = playersRes.data?.data || []
      setPlayers(playerList)

      // 获取当前活跃赛季
      const seasonRes = await Network.request({ url: '/api/seasons/active' })
      const activeSeason = seasonRes.data?.data?.[0]
      setCurrentSeason(activeSeason || null)

      if (!activeSeason) {
        Taro.showToast({ title: '没有活跃赛季', icon: 'none' })
        setLoading(false)
        return
      }

      // 获取该赛季所有战绩
      const matchesRes = await Network.request({
        url: '/api/matches',
        data: { seasonId: activeSeason.id }
      })
      const matchList = matchesRes.data?.data || []

      // 计算统计数据
      calculateStats(playerList, matchList)
    } catch (error) {
      console.error('获取数据失败:', error)
      Taro.showToast({ title: '获取数据失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 计算玩家参赛统计和搭档合作统计
  const calculateStats = (playerList: Player[], matchList: Match[]) => {
    // 统计每个玩家的参赛次数
    const playerMatchCount: Record<string, number> = {}
    playerList.forEach(p => { playerMatchCount[p.id] = 0 })

    // 统计每对玩家的合作次数
    const partnerMatchCount: Record<string, number> = {}

    matchList.forEach(match => {
      const team1 = [match.team1_player1_id, match.team1_player2_id]
      const team2 = [match.team2_player1_id, match.team2_player2_id]

      // 统计参赛次数
      team1.forEach(id => { if (playerMatchCount[id] !== undefined) playerMatchCount[id]++ })
      team2.forEach(id => { if (playerMatchCount[id] !== undefined) playerMatchCount[id]++ })

      // 统计搭档合作次数（排序后生成key）
      const key1 = team1.sort().join('_')
      const key2 = team2.sort().join('_')
      partnerMatchCount[key1] = (partnerMatchCount[key1] || 0) + 1
      partnerMatchCount[key2] = (partnerMatchCount[key2] || 0) + 1
    })

    // 构建玩家统计
    const pStats = playerList.map(p => ({
      id: p.id,
      name: p.name,
      totalMatches: playerMatchCount[p.id] || 0
    })).sort((a, b) => a.totalMatches - b.totalMatches)

    setPlayerStats(pStats)

    // 构建搭档统计
    const partnerKeys = Object.keys(partnerMatchCount)
    const ptnStats = partnerKeys.map(key => {
      const [p1Id, p2Id] = key.split('_')
      const p1 = playerList.find(p => p.id === p1Id)
      const p2 = playerList.find(p => p.id === p2Id)
      return {
        player1Id: p1Id,
        player2Id: p2Id,
        player1Name: p1?.name || '未知',
        player2Name: p2?.name || '未知',
        totalMatches: partnerMatchCount[key]
      }
    }).sort((a, b) => a.totalMatches - b.totalMatches)

    setPartnerStats(ptnStats)
  }

  // 获取两玩家的合作次数
  const getPartnerHistory = (p1Id: string, p2Id: string): number => {
    const key = [p1Id, p2Id].sort().join('_')
    const partner = partnerStats.find(p => 
      [p.player1Id, p.player2Id].sort().join('_') === key
    )
    return partner?.totalMatches || 0
  }

  // 生成对阵建议
  const generateSuggestion = () => {
    if (players.length < 4) {
      Taro.showToast({ title: '至少需要4名玩家', icon: 'none' })
      return
    }

    setGenerating(true)

    // 模拟算法思考时间
    setTimeout(() => {
      const newSuggestion = generateOptimalMatch()
      setSuggestion(newSuggestion)
      setIsRestored(false)
      // 保存到本地存储，便于赛后录入战绩
      Taro.setStorageSync('arrange_suggestion', newSuggestion)
      Taro.setStorageSync('arrange_timestamp', Date.now())
      setGenerating(false)
    }, 500)
  }

  // 核心算法：生成最优对阵
  const generateOptimalMatch = (): MatchSuggestion => {
    // 复制玩家列表，按参赛次数排序（次数少的优先）
    const sortedPlayers = [...playerStats].sort((a, b) => a.totalMatches - b.totalMatches)
    
    // 策略：优先选择参赛次数最少的4个人，然后在他们之间寻找合作最少的组合
    const candidates = sortedPlayers.slice(0, Math.min(6, sortedPlayers.length))
    
    // 生成所有可能的组合
    const allTeams: TeamSuggestion[] = []
    
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const p1 = candidates[i]
        const p2 = candidates[j]
        const history = getPartnerHistory(p1.id, p2.id)
        
        allTeams.push({
          player1: { id: p1.id, name: p1.name },
          player2: { id: p2.id, name: p2.name },
          avgMatches: (p1.totalMatches + p2.totalMatches) / 2,
          partnerHistory: history
        })
      }
    }

    // 为每支队伍打分（分数越低越好）
    // 考虑因素：参赛次数少加分，合作次数少加分
    const scoredTeams = allTeams.map(team => ({
      ...team,
      score: team.avgMatches * 2 + team.partnerHistory * 5 // 合作历史权重更高
    }))

    // 按分数排序
    scoredTeams.sort((a, b) => a.score - b.score)

    // 尝试找到不冲突的两支队伍
    let bestMatch: MatchSuggestion | null = null
    let bestBalanceScore = Infinity

    // 从前50%的候选中随机选择，增加多样性
    const topTeams = scoredTeams.slice(0, Math.max(10, Math.floor(scoredTeams.length * 0.5)))

    for (let i = 0; i < topTeams.length && i < 20; i++) {
      for (let j = i + 1; j < topTeams.length && j < 20; j++) {
        const team1 = topTeams[i]
        const team2 = topTeams[j]

        // 检查是否有重复玩家
        const players1 = [team1.player1.id, team1.player2.id]
        const players2 = [team2.player1.id, team2.player2.id]
        const hasOverlap = players1.some(p => players2.includes(p))

        if (!hasOverlap) {
          // 计算队伍平衡性（两队平均参赛次数越接近越好）
          const balanceScore = Math.abs(team1.avgMatches - team2.avgMatches)
          const diversityScore = team1.partnerHistory + team2.partnerHistory
          const totalScore = balanceScore * 2 + diversityScore

          if (totalScore < bestBalanceScore) {
            bestBalanceScore = totalScore
            bestMatch = {
              team1,
              team2,
              balanceScore,
              diversityScore
            }
          }
        }
      }
    }

    // 如果没找到理想组合，随机生成一个
    if (!bestMatch) {
      const shuffled = [...players].sort(() => Math.random() - 0.5)
      bestMatch = {
        team1: {
          player1: shuffled[0],
          player2: shuffled[1],
          avgMatches: 0,
          partnerHistory: 0
        },
        team2: {
          player1: shuffled[2],
          player2: shuffled[3],
          avgMatches: 0,
          partnerHistory: 0
        },
        balanceScore: 0,
        diversityScore: 0
      }
    }

    return bestMatch
  }

  // 使用当前方案录入战绩
  const useSuggestion = () => {
    if (!suggestion) return

    const { team1, team2 } = suggestion

    if (!currentSeason) {
      Taro.showToast({ title: '没有活跃赛季', icon: 'none' })
      return
    }

    // 清除暂存的对阵方案
    Taro.removeStorageSync('arrange_suggestion')
    Taro.removeStorageSync('arrange_timestamp')

    // 跳转到战绩录入页面，携带预设的玩家参数
    const params = new URLSearchParams({
      seasonId: currentSeason.id,
      team1p1: team1.player1.id,
      team1p2: team1.player2.id,
      team2p1: team2.player1.id,
      team2p2: team2.player2.id,
    })

    Taro.navigateTo({
      url: `/pages/record-form/index?${params.toString()}`
    })
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useDidShow(() => {
    fetchData()
    // 恢复暂存的对阵方案
    const savedSuggestion = Taro.getStorageSync('arrange_suggestion')
    if (savedSuggestion) {
      setSuggestion(savedSuggestion)
      setIsRestored(true)
    }
  })

  if (loading) {
    return (
      <View className="arrange-page">
        <View className="loading-container">
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="arrange-page">
      {/* 头部 */}
      <View className="header">
        <View className="header-left" onClick={() => Taro.navigateBack()}>
          <Icon name="ArrowLeft" size={24} color="#ffffff" />
        </View>
        <Text className="header-title">安排对阵</Text>
        <View className="header-placeholder" />
      </View>

      <View className="content">
        {/* 算法说明 */}
        <View className="info-card">
          <View className="info-header">
            <Icon name="Sparkles" size={20} color="#fbbf24" />
            <Text className="info-title">智能匹配算法</Text>
          </View>
          <Text className="info-desc">
            根据本赛季历史数据，优先安排参赛次数少的人，尽量让合作次数少的玩家组队
          </Text>
        </View>

        {/* 玩家参赛统计 */}
        <View className="stats-card">
          <View className="stats-header">
            <Icon name="Trophy" size={20} color="#3b82f6" />
            <Text className="stats-title">本赛季参赛统计</Text>
          </View>
          <View className="player-stats-list">
            {playerStats.map((player, index) => (
              <View key={player.id} className="player-stat-item">
                <View className="player-rank">
                  <Text className={`rank-text rank-${index < 3 ? index + 1 : 'other'}`}>
                    {index + 1}
                  </Text>
                </View>
                <Text className="player-name">{player.name}</Text>
                <View className="player-matches">
                  <Text className="matches-count">{player.totalMatches}</Text>
                  <Text className="matches-label">场</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 生成按钮 */}
        <View className="action-section">
          <Button
            className="generate-btn"
            onClick={generateSuggestion}
            disabled={generating}
          >
            <Icon name={suggestion ? 'Refresh' : 'Shuffle'} size={20} color="#ffffff" />
            <Text className="generate-btn-text">
              {generating ? '计算中...' : suggestion ? '重新生成' : '生成对阵方案'}
            </Text>
          </Button>
        </View>

        {/* 对阵方案 */}
        {suggestion && (
          <View className="suggestion-card">
            <View className="suggestion-header">
              <Icon name="Users" size={24} color="#8b5cf6" />
              <Text className="suggestion-title">推荐对阵</Text>
              {isRestored && (
                <View className="restored-badge">
                  <Text className="restored-text">已暂存</Text>
                </View>
              )}
            </View>

            <View className="match-preview">
              {/* 队伍1 */}
              <View className="team-block team1">
                <View className="team-header">
                  <Text className="team-label">队伍1</Text>
                  {suggestion.team1.partnerHistory > 0 && (
                    <Text className="team-history">已合作{suggestion.team1.partnerHistory}次</Text>
                  )}
                </View>
                <View className="team-players">
                  <View className="team-player">
                    <View className="player-avatar">
                      <Text className="avatar-text">{suggestion.team1.player1.name.charAt(0)}</Text>
                    </View>
                    <Text className="player-name">{suggestion.team1.player1.name}</Text>
                  </View>
                  <Text className="player-plus">+</Text>
                  <View className="team-player">
                    <View className="player-avatar">
                      <Text className="avatar-text">{suggestion.team1.player2.name.charAt(0)}</Text>
                    </View>
                    <Text className="player-name">{suggestion.team1.player2.name}</Text>
                  </View>
                </View>
              </View>

              {/* VS */}
              <View className="vs-divider">
                <Text className="vs-text">VS</Text>
              </View>

              {/* 队伍2 */}
              <View className="team-block team2">
                <View className="team-header">
                  <Text className="team-label">队伍2</Text>
                  {suggestion.team2.partnerHistory > 0 && (
                    <Text className="team-history">已合作{suggestion.team2.partnerHistory}次</Text>
                  )}
                </View>
                <View className="team-players">
                  <View className="team-player">
                    <View className="player-avatar">
                      <Text className="avatar-text">{suggestion.team2.player1.name.charAt(0)}</Text>
                    </View>
                    <Text className="player-name">{suggestion.team2.player1.name}</Text>
                  </View>
                  <Text className="player-plus">+</Text>
                  <View className="team-player">
                    <View className="player-avatar">
                      <Text className="avatar-text">{suggestion.team2.player2.name.charAt(0)}</Text>
                    </View>
                    <Text className="player-name">{suggestion.team2.player2.name}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 方案说明 */}
            <View className="suggestion-reason">
              <Text className="reason-text">
                💡 该方案优先选择参赛{suggestion.team1.avgMatches < 3 ? '较少' : '适中'}的选手，
                {suggestion.diversityScore === 0 ? '且两队均为全新组合' : '尽量减少重复搭档'}
              </Text>
            </View>

            {/* 使用方案按钮 */}
            <Button className="use-suggestion-btn" onClick={useSuggestion}>
              <Icon name="Check" size={18} color="#ffffff" />
              <Text className="use-btn-text">使用此方案录入战绩</Text>
            </Button>
          </View>
        )}
      </View>
    </View>
  )
}
