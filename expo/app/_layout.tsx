import '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { useGlobalStore } from '@/store/useGlobalStore'
import * as Linking from 'expo-linking'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ThemeProvider, useTheme } from '@/components/ThemeProvider'
import { View } from 'react-native'

import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope'
import * as SplashScreen from 'expo-splash-screen'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const router = useRouter()
  const { activeTheme } = useTheme()
  
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url
      if (!url) return

      // Handle standard Supabase auth redirects (email confirmation, password reset)
      // These often come as #access_token=...&refresh_token=...&type=...
      const hashIndex = url.indexOf('#')
      if (hashIndex !== -1) {
        const hashFragment = url.substring(hashIndex + 1)
        const params = new URLSearchParams(hashFragment)
        
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type') // 'recovery', 'signup', 'invite'
        
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (!error && data.session) {
            if (type === 'recovery') {
              router.replace('/(auth)/reset-password')
            } else {
              // For signup/invite or generic login, go to app
              router.replace('/(app)')
            }
          }
        }
      }
    }

    const subscription = Linking.addEventListener('url', handleDeepLink)

    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url })
      }
    })

    // Listen for auth state changes (e.g. session expiration or manual logout)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Sync with global store
      useGlobalStore.getState().setSession(session);

      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Optional: Ensure we are in the app? 
        // Usually index.tsx or the deep link handler takes care of navigation, 
        // but this safeguards against inconsistent states.
      }
    })

    return () => {
      subscription.remove()
      authSubscription.unsubscribe()
    }
  }, [])

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  )
}