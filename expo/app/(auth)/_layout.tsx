import { Stack } from 'expo-router'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'

export default function AuthLayout() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right', // Optional: explicitly set animation to ensure smoothness
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="two-factor" />
    </Stack>
  )
}