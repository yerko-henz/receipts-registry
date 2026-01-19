import { MFASetup } from '@/components/MFASetup'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { storage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { useTheme } from '@/components/ThemeProvider'
import { ChevronRight, Globe, Key, Mail, Palette, Shield, User } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Alert as RNAlert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// Helper function to check if a setting is visible outside the component if needed, 
// but we'll define the dynamic one inside.
type SettingConfig = {
  id: string
  visible: boolean
  order: number
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  
  const [user, setUser] = useState<any>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false)
  const [showMFAModal, setShowMFAModal] = useState(false)
  const { theme, setTheme } = useTheme()
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mfaFactors, setMfaFactors] = useState<any[]>([])
  const [resendCooldown, setResendCooldown] = useState(0)

  // Settings visibility configuration
  // Moved inside component to handle dynamic visibility based on state (e.g., user email status)
  const settingsConfig: SettingConfig[] = [
    { id: 'userDetails', visible: true, order: 1 },
    { id: 'verifyEmail', visible: !user?.email_confirmed_at, order: 2 },
    { id: 'changePassword', visible: true, order: 3 },
    { id: 'mfa', visible: false, order: 4 },
    { id: 'language', visible: false, order: 5 },
    { id: 'theme', visible: true, order: 6 },
    { id: 'logout', visible: true, order: 7 },
  ]

  const isSettingVisible = (settingId: string) => {
    const setting = settingsConfig.find(s => s.id === settingId)
    return setting?.visible ?? false
  }

  useEffect(() => {
    loadUser()
    loadMFAFactors()
  }, [])

  useEffect(() => {
    let interval: any
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCooldown])

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function loadMFAFactors() {
    const { data } = await supabase.auth.mfa.listFactors()
    setMfaFactors(data?.totp || [])
  }

  async function handleChangePassword() {
    setError('')
    setSuccess('')
    
    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordsDoNotMatch'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('settings.passwordTooShort'))
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(t('settings.passwordUpdated'))
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setShowPasswordModal(false)
        setSuccess('')
      }, 2000)
    }

    setLoading(false)
  }

  async function handleOpenVerifyEmailModal() {
    setShowVerifyEmailModal(true)
    setError('')
    setSuccess('')
    setVerificationCode('')
    // setEmailSent(false)
    
    // Automatically send verification email when modal opens
    await sendVerificationEmail()
  }

  async function sendVerificationEmail() {
    if (!user?.email) return
    
    setLoading(true)
    setError('')
    
    const { error: sendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    })
    
    if (sendError) {
      setError(sendError.message)
    } else {
      // setEmailSent(true)
      setResendCooldown(60) // Start 60 second cooldown
      setSuccess(t('settings.verificationEmailSent', { defaultValue: 'Verification email sent!' }))
    }
    
    setLoading(false)
  }

  async function handleVerifyEmail() {
    setError('')
    setSuccess('')
    
    if (!verificationCode || verificationCode.length < 6) {
      setError(t('auth.invalidCode', { defaultValue: 'Please enter a valid code' }))
      return
    }
    
    setLoading(true)
    
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: user?.email,
      token: verificationCode,
      type: 'email',
    })
    
    if (verifyError) {
      setError(verifyError.message)
    } else {
      setSuccess(t('settings.emailVerified', { defaultValue: 'Email verified successfully!' }))
      await loadUser()
      setTimeout(() => {
        setShowVerifyEmailModal(false)
        setSuccess('')
      }, 2000)
    }
    
    setLoading(false)
  }

  async function handleChangeLanguage(lang: string) {
    await storage.setLanguage(lang)
    i18n.changeLanguage(lang)
    setShowLanguageModal(false)
  }

  async function handleChangeTheme(newTheme: 'light' | 'dark' | 'system') {
    await setTheme(newTheme)
    setShowThemeModal(false)
  }

  async function handleLogout() {
    RNAlert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        { text: t('storage.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('settings.title')}
          </Text>
        </View>

        {/* User Details */}
        {isSettingVisible('userDetails') && (
          <Card>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={20} color={colors.icon} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('settings.userDetails')}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.icon }]}>
                  {t('auth.email')}
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {user?.email}
                </Text>
              </View>

            </View>
          </Card>
        )}

        {/* Verify Email */}
        {isSettingVisible('verifyEmail') && (
          <TouchableOpacity onPress={handleOpenVerifyEmailModal}>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Mail size={20} color={colors.icon} />
                  <View>
                    <Text style={[styles.settingText, { color: colors.text }]}>
                      {t('settings.verifyEmail', { defaultValue: 'Verify Email' })}
                    </Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>
                      {t('settings.emailNotVerified', { defaultValue: 'Email not verified' })}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.icon} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Change Password */}
        {isSettingVisible('changePassword') && (
          <TouchableOpacity onPress={() => setShowPasswordModal(true)}>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Key size={20} color={colors.icon} />
                  <Text style={[styles.settingText, { color: colors.text }]}>
                    {t('settings.changePassword')}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.icon} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* MFA */}
        {isSettingVisible('mfa') && (
          <TouchableOpacity onPress={() => setShowMFAModal(true)}>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Shield size={20} color={colors.icon} />
                  <View>
                    <Text style={[styles.settingText, { color: colors.text }]}>
                      {t('settings.mfa')}
                    </Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>
                      {mfaFactors.length > 0 
                        ? `${mfaFactors.length} ${t('mfa.devicesEnrolled')}`
                        : t('settings.mfaNotEnabled')
                      }
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.icon} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Language */}
        {isSettingVisible('language') && (
          <TouchableOpacity onPress={() => setShowLanguageModal(true)}>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Globe size={20} color={colors.icon} />
                  <View>
                    <Text style={[styles.settingText, { color: colors.text }]}>
                      {t('settings.language')}
                    </Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>
                      {i18n.language === 'pl' 
                        ? t('settings.languages.polish')
                        : i18n.language === 'zh'
                        ? t('settings.languages.chinese')
                        : t('settings.languages.english')
                      }
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.icon} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Theme */}
        {isSettingVisible('theme') && (
          <TouchableOpacity onPress={() => setShowThemeModal(true)}>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Palette size={20} color={colors.icon} />
                  <View>
                    <Text style={[styles.settingText, { color: colors.text }]}>
                      {t('settings.theme', { defaultValue: 'Theme' })}
                    </Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>
                      {theme === 'system' 
                        ? t('settings.themes.system', { defaultValue: 'System' })
                        : theme === 'light'
                        ? t('settings.themes.light', { defaultValue: 'Light' })
                        : t('settings.themes.dark', { defaultValue: 'Dark' })
                      }
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.icon} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Logout */}
        {isSettingVisible('logout') && (
          <Button
            title={t('auth.logout')}
            onPress={handleLogout}
            variant="outline"
          />
        )}
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.changePassword')}
            </Text>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Text style={{ color: colors.tint }}>
                {t('settings.close')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {error && <Alert variant="error" message={error} />}
            {success && <Alert variant="success" message={success} />}

            <Input
              label={t('settings.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('settings.enterNewPassword')}
              secureTextEntry
            />

            <Input
              label={t('settings.confirmNewPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('settings.confirmNewPasswordPlaceholder')}
              secureTextEntry
            />

            <Button
              title={t('settings.updatePassword')}
              onPress={handleChangePassword}
              loading={loading}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Verify Email Modal */}
      <Modal
        visible={showVerifyEmailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVerifyEmailModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.verifyEmail', { defaultValue: 'Verify Email' })}
            </Text>
            <TouchableOpacity onPress={() => setShowVerifyEmailModal(false)}>
              <Text style={{ color: colors.tint }}>
                {t('settings.close')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {error && <Alert variant="error" message={error} />}
            {success && <Alert variant="success" message={success} />}

            <Text style={[styles.modalDescription, { color: colors.icon }]}>
              {t('settings.verifyEmailDescription', { 
                defaultValue: `We've sent a verification code to ${user?.email}. Enter it below to verify your email.` 
              })}
            </Text>

            <Input
              label={t('auth.code', { defaultValue: 'Verification Code' })}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="123456"
              keyboardType="numeric"
            />

            <Button
              title={t('settings.verifyCode', { defaultValue: 'Verify Code' })}
              onPress={handleVerifyEmail}
              loading={loading}
            />

            <Button
              title={resendCooldown > 0 
                ? t('settings.resendCodeWithTimer', { defaultValue: `Resend Code (${resendCooldown}s)`, seconds: resendCooldown })
                : t('settings.resendCode', { defaultValue: 'Resend Code' })
              }
              onPress={sendVerificationEmail}
              variant="ghost"
              loading={loading}
              disabled={resendCooldown > 0}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* MFA Modal */}
      <Modal
        visible={showMFAModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMFAModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('mfa.title')}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowMFAModal(false)
              loadMFAFactors()
            }}>
              <Text style={{ color: colors.tint }}>
                {t('settings.close')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <MFASetup onStatusChange={loadMFAFactors} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.language')}
            </Text>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <Text style={{ color: colors.tint }}>
                {t('settings.close')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                i18n.language === 'en' && { backgroundColor: colors.tint }
              ]}
              onPress={() => handleChangeLanguage('en')}
            >
              <Text style={[
                styles.languageText,
                { color: i18n.language === 'en' ? '#fff' : colors.text }
              ]}>
                {t('settings.languages.english')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                i18n.language === 'pl' && { backgroundColor: colors.tint }
              ]}
              onPress={() => handleChangeLanguage('pl')}
            >
              <Text style={[
                styles.languageText,
                { color: i18n.language === 'pl' ? '#fff' : colors.text }
              ]}>
                {t('settings.languages.polish')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                i18n.language === 'zh' && { backgroundColor: colors.tint }
              ]}
              onPress={() => handleChangeLanguage('zh')}
            >
              <Text style={[
                styles.languageText,
                { color: i18n.language === 'zh' ? '#fff' : colors.text }
              ]}>
                {t('settings.languages.chinese')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Theme Modal */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.theme', { defaultValue: 'Theme' })}
            </Text>
            <TouchableOpacity onPress={() => setShowThemeModal(false)}>
              <Text style={{ color: colors.tint }}>
                {t('settings.close')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {[
              { label: t('settings.themes.system', { defaultValue: 'System' }), value: 'system' },
              { label: t('settings.themes.light', { defaultValue: 'Light' }), value: 'light' },
              { label: t('settings.themes.dark', { defaultValue: 'Dark' }), value: 'dark' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.languageOption,
                  theme === option.value && { backgroundColor: colors.tint }
                ]}
                onPress={() => handleChangeTheme(option.value as any)}
              >
                <Text style={[
                  styles.languageText,
                  { color: theme === option.value ? '#fff' : colors.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  languageOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
})