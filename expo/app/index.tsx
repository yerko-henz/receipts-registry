import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error

      if (session) {
        router.replace('/(app)')
      } else {
        router.replace('/(auth)/login')
      }
    } catch (error) {
      console.error('Check auth error:', error)
      // If we can't get the session, default to login to avoid getting stuck
      router.replace('/(auth)/login')
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  )
}