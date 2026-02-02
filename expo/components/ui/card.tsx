import { Colors } from '@/constants/theme'
import { CommonStyles } from '@/constants/Styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { StyleSheet, View, ViewStyle } from 'react-native'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: CardProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  
  return (
    <View style={[
      CommonStyles.getCardStyle(colors),
      style
    ]}>
      {children}
    </View>
  )
}