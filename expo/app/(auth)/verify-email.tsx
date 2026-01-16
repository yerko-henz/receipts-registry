import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { supabase } from '@/lib/supabase'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CheckCircle, Mail } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function VerifyEmailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ email: string }>()
  const email = params.email || ''
  
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleVerify() {
    if (!code || code.length < 6) {
      setError(t('auth.invalidCode', { defaultValue: 'Please enter a valid code' }))
      return
    }

    setError('')
    setLoading(true)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
    } else {
      // Successful verification
      // The session should be set automatically by Supabase client
      router.replace('/(app)')
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={64} color={colors.tint} />
        </View>
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('auth.verifyEmail')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {t('auth.enterCodeDescription', { 
              defaultValue: `We've sent a code to ${email}. Enter it below to verify your account.` 
            })}
          </Text>
        </View>

        {error ? <Alert variant="error" message={error} /> : null}

        <Input
          label={t('auth.code', { defaultValue: 'Verification Code' })}
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <View style={styles.buttonContainer}>
          <Button
            title={t('auth.verify', { defaultValue: 'Verify' })}
            onPress={handleVerify}
            loading={loading}
          />
          
          <Button
            title={t('auth.backToLogin')}
            onPress={() => router.replace('/(auth)/login')}
            variant="ghost"
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
})