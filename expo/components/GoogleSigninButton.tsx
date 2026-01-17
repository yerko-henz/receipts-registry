import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { supabase } from '@/lib/supabase'
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export function GoogleSigninButton() {
  const { t } = useTranslation()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const [loading, setLoading] = useState(false)

  const handleGoogleSignin = async () => {
    try {
      setLoading(true)
      await GoogleSignin.hasPlayServices()
      const userInfo = await GoogleSignin.signIn()
      
      if (userInfo.data?.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        })

        if (error) throw error

        if (data.session) {
          router.replace('/(app)')
        }
      } else {
        throw new Error('No ID token present!')
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        // some other error happened
        console.error(error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor: colors.border }]}
      onPress={handleGoogleSignin}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.text, { color: colors.text }]}>
            {t('auth.continueWithGoogle')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    marginTop: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
})
