import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { supabase } from '@/lib/supabase'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useRouter } from 'expo-router'
import { ArrowRight, Check, Sheet, User } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native'
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated'
import { GoogleSignin } from '@/lib/google-signin'
import { connectToGoogleSheets } from '@/services/google-sheets'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAlertStore } from '@/store/useAlertStore'

const { width } = Dimensions.get('window')

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const showAlert = useAlertStore(state => state.showAlert)
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const { user, setUser } = useGlobalStore()
  
  const [step, setStep] = useState(1)
  const [name, setName] = useState(user?.user_metadata?.full_name?.split(' ')[0] || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNextStep = async () => {
    setError('')
    
    if (step === 1) {
      if (!name.trim()) {
        setError(t('onboarding.nameRequired', { defaultValue: 'Please enter your name' }))
        return
      }
      
      setLoading(true)
      
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { full_name: name }
      })

      setLoading(false)

      if (updateError) {
        setError(updateError.message)
        return
      }
      
      // Update global store
      if (data.user) {
         setUser(data.user)
      }
      
      setStep(2)
    } else {
        // Final step completion
        await completeOnboarding()
    }
  }

  const completeOnboarding = async () => {
      // Mark onboarding as completed
      const { data } = await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      })
      
      if (data.user) {
         setUser(data.user)
      }
      router.replace('/(app)')
  }

  const handleGoogleSync = async () => {
    try {
        setLoading(true)
        
        await connectToGoogleSheets(t);
        
        // If successful, mark as complete
        await completeOnboarding()
    } catch (error: any) {
        console.error("Google Sync Error", error)
        showAlert("Sync Error", error?.message || "Could not connect to Google Sheets. You can try again later in Settings.")
    } finally {
        setLoading(false)
    }
  }

  const skipSync = async () => {
      await completeOnboarding()
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          
          {/* Progress Dots */}
          <View style={styles.pagination}>
            <View style={[styles.dot, step === 1 ? { backgroundColor: colors.text, width: 24 } : { backgroundColor: colors.border }]} />
            <View style={[styles.dot, step === 2 ? { backgroundColor: colors.text, width: 24 } : { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.stepContainer}>
            {step === 1 && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContent}>
                 <View style={[styles.illustrationContainer, { backgroundColor: '#FFDCA8' }]}>
                    {/* Placeholder for Plant Illustration */}
                     <User size={80} color="#F9874B" />
                 </View>
                 
                 <Text style={[styles.title, { color: colors.text }]}>
                    {t('onboarding.step1Title', { defaultValue: "What's your name?" })}
                 </Text>
                 <Text style={[styles.subtitle, { color: colors.icon }]}>
                    {t('onboarding.step1Subtitle', { defaultValue: "Let's get to know each other." })}
                 </Text>

                 {error ? <Text style={{ color: colors.notification, marginBottom: 12 }}>{error}</Text> : null}

                 <View style={{ marginTop: 24, width: '100%' }}>
                    <Input
                        placeholder={t('onboarding.namePlaceholder', { defaultValue: "Full Name" })}
                        value={name}
                        onChangeText={setName}
                    />
                 </View>
              </Animated.View>
            )}

            {step === 2 && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.stepContent}>
                <View style={[styles.illustrationContainer, { backgroundColor: '#EEF2FF' }]}>
                     {/* Placeholder for Sync Illustration */}
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <Image 
                            source={{ uri: 'https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png' }} 
                            style={{ width: 48, height: 48, resizeMode: 'contain' }}
                        />
                        <ArrowRight size={24} color={colors.icon} />
                        <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={32} color="white" />
                        </View>
                     </View>
                 </View>

                 <Text style={[styles.title, { color: colors.text }]}>
                    {t('onboarding.step2Title', { defaultValue: "Sync with Google Sheets?" })}
                 </Text>
                 <Text style={[styles.subtitle, { color: colors.icon }]}>
                    {t('onboarding.step2Subtitle', { defaultValue: "Never lose a receipt again. Automatically export your scanned expenses directly to a private Google Sheet in real-time." })}
                 </Text>

              </Animated.View>
            )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step === 1 ? (
                <Button 
                    title={t('common.next', { defaultValue: "Next" })}
                    onPress={handleNextStep}
                    loading={loading}
                />
            ) : (
                <View style={{ gap: 12, width: '100%' }}>
                     {/* Custom Button for Google Sync to support custom style/icon */}
                     <TouchableOpacity 
                        style={[styles.customButton, { backgroundColor: '#10B981' }]} 
                        onPress={handleGoogleSync}
                        disabled={loading}
                     >
                        {loading ? <ActivityIndicator color="white" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Image 
                                    source={{ uri: 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png' }} 
                                    style={{ width: 24, height: 24, resizeMode: 'contain' }}
                                />
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                                    {t('onboarding.connectGoogle', { defaultValue: "Connect Google Sheets" })}
                                </Text>
                            </View>
                        )}
                     </TouchableOpacity>

                    <TouchableOpacity onPress={skipSync} style={{ padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: colors.icon, fontWeight: '600' }}>
                            {t('common.maybeLater', { defaultValue: "Maybe Later" })}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    width: '100%',
    alignItems: 'center',
  },
  illustrationContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  footer: {
    width: '100%',
    marginBottom: 10,
  },
  customButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
})
