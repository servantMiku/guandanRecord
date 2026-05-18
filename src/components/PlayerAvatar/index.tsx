import { View, Text, Image } from '@tarojs/components'

interface PlayerAvatarProps {
  player?: { id: string; name: string; avatar?: string | null } | null
  size?: number
  className?: string
  /** 默认颜色索引 (0-5)，用于背景渐变 */
  colorIndex?: number
  onClick?: () => void
}

const avatarColors = [
  'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
  'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
]

export function PlayerAvatar({ player, size = 60, className = '', colorIndex = 0, onClick }: PlayerAvatarProps) {
  const hasAvatar = player?.avatar && player.avatar.length > 10
  const initial = player?.name ? player.name.charAt(0).toUpperCase() : '?'
  const fontSize = size * 0.45

  return (
    <View
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        background: hasAvatar ? 'none' : avatarColors[colorIndex % avatarColors.length],
        position: 'relative',
      }}
      onClick={onClick}
    >
      {hasAvatar ? (
        <Image
          src={player!.avatar!}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
          }}
          mode="aspectFill"
        />
      ) : (
        <Text
          style={{
            color: '#ffffff',
            fontSize: `${fontSize}px`,
            fontWeight: 'bold',
            lineHeight: 1,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  )
}

export default PlayerAvatar
