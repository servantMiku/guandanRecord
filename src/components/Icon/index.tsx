import { Text } from '@tarojs/components'

// 图标映射表 - 使用 Unicode 字符和样式模拟图标
const iconMap: Record<string, { char: string; color?: string }> = {
  // 奖杯/胜利
  Trophy: { char: '🏆', color: '#fbbf24' },
  // 日历
  Calendar: { char: '📅', color: '#60a5fa' },
  // 用户/人群
  Users: { char: '👥', color: '#a78bfa' },
  // 趋势/上升
  TrendingUp: { char: '📈', color: '#4ade80' },
  // 添加/加号
  Plus: { char: '＋', color: '#ffffff' },
  // 编辑/铅笔
  Edit: { char: '✎', color: '#ffffff' },
  // 保存
  Save: { char: '✓', color: '#ffffff' },
  // 关闭/删除
  X: { char: '✕', color: '#ffffff' },
  Trash2: { char: '🗑', color: '#ffffff' },
  // 筛选
  Filter: { char: '🔍', color: '#f472b6' },
  // 火焰/连胜
  Flame: { char: '🔥', color: '#f97316' },
  // 趋势下降
  TrendingDown: { char: '📉', color: '#ef4444' },
  // 皇冠/冠军
  Crown: { char: '👑', color: '#fbbf24' },
  // 奖章
  Medal: { char: '🥇', color: '#fbbf24' },
  // 箭头左
  ArrowLeft: { char: '←', color: '#ffffff' },
  // 历史记录
  History: { char: '⏱', color: '#60a5fa' },
  // 时钟
  Clock: { char: '⏰', color: '#fbbf24' },
  // 勾选/完成
  CheckCircle: { char: '✓', color: '#4ade80' },
}

interface IconProps {
  name: keyof typeof iconMap
  size?: number
  color?: string
  className?: string
}

export function Icon({ name, size = 24, color, className = '' }: IconProps) {
  const icon = iconMap[name]
  if (!icon) return null

  return (
    <Text
      className={`icon-component ${className}`}
      style={{
        fontSize: `${size}px`,
        color: color || icon.color,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon.char}
    </Text>
  )
}

export default Icon
