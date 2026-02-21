import AsyncStorage from '@react-native-async-storage/async-storage';
import { MFASetup } from '@/components/MFASetup';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { GoogleSignin } from '@/lib/google-signin';
import { useRouter } from 'expo-router';
import { useGlobalStore } from '@/store/useGlobalStore';
import { useTheme } from '@/components/ThemeProvider';
import { useAlertStore } from '@/store/useAlertStore';
import { ensureSheetExists, connectToGoogleSheets } from '@/services/google-sheets';
import { setRegionLocale } from '@/lib/currency';
import { ChevronRight, Globe, Key, Mail, Palette, Shield, User, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';

// Helper function to check if a setting is visible outside the component if needed,
// but we'll define the dynamic one inside.
type SettingConfig = {
  id: string;
  visible: boolean;
  order: number;
};

const REGIONS = [
  { code: 'en-US', label: 'United States (USD)', currency: 'USD' },
  { code: 'es-CL', label: 'Chile (CLP)', currency: 'CLP' },
  { code: 'es-MX', label: 'Mexico (MXN)', currency: 'MXN' },
  { code: 'es-AR', label: 'Argentina (ARS)', currency: 'ARS' },
  { code: 'es-CO', label: 'Colombia (COP)', currency: 'COP' },
  { code: 'es-PE', label: 'Peru (PEN)', currency: 'PEN' }
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const showAlert = useAlertStore((state) => state.showAlert);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [user, setUser] = useState<any>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const { theme, setTheme } = useTheme();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [region, setRegion] = useState('en-US');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Settings visibility configuration
  // Moved inside component to handle dynamic visibility based on state (e.g., user email status)
  const settingsConfig: SettingConfig[] = [
    { id: 'userDetails', visible: true, order: 1 },
    {
      id: 'verifyEmail',
      visible: !!user && !user.email_confirmed_at,
      order: 2
    },
    { id: 'changePassword', visible: true, order: 3 },
    { id: 'mfa', visible: false, order: 4 },
    { id: 'language', visible: true, order: 5 },
    { id: 'region', visible: true, order: 6 },
    { id: 'theme', visible: true, order: 7 },
    { id: 'logout', visible: true, order: 8 }
  ];

  const isSettingVisible = (settingId: string) => {
    const setting = settingsConfig.find((s) => s.id === settingId);
    return setting?.visible ?? false;
  };

  useEffect(() => {
    loadUser();
    loadMFAFactors();
    loadRegion();
    checkSyncStatus();
  }, []);

  async function checkSyncStatus() {
    const id = await AsyncStorage.getItem('google_sheet_id');
    setSheetId(id);
  }

  async function loadRegion() {
    const saved = await storage.getRegion();
    if (saved) setRegion(saved);
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  async function loadUser() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    setUser(user);
  }

  // ...

  async function handleGoogleSync() {
    try {
      setLoading(true);
      const id = await connectToGoogleSheets(t);
      setSheetId(id);
      showAlert(t('common.success'), t('settings.permissionsGranted'));
    } catch (error: any) {
      console.warn('Google Sync Error', error);
      showAlert(t('common.error'), error?.message || t('settings.connectError'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMFAFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaFactors(data?.totp || []);
  }

  async function handleChangePassword() {
    setError('');
    setSuccess('');

    if (!currentPassword.trim()) {
      setError(t('settings.enterCurrentPassword'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordsDoNotMatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('settings.passwordTooShort'));
      return;
    }

    setPasswordModalLoading(true);

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword
    });

    if (signInError) {
      setError(t('settings.wrongCurrentPassword'));
      setPasswordModalLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(t('settings.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setSuccess('');
      }, 2000);
    }

    setPasswordModalLoading(false);
  }

  async function handleOpenVerifyEmailModal() {
    setShowVerifyEmailModal(true);
    setError('');
    setSuccess('');
    setVerificationCode('');
    // setEmailSent(false)

    // Automatically send verification email when modal opens
    await sendVerificationEmail();
  }

  async function sendVerificationEmail() {
    if (!user?.email) return;

    setLoading(true);
    setError('');

    const { error: sendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email
    });

    if (sendError) {
      setError(sendError.message);
    } else {
      // setEmailSent(true)
      setResendCooldown(60); // Start 60 second cooldown
      setSuccess(
        t('settings.verificationEmailSent', {
          defaultValue: 'Verification email sent!'
        })
      );
    }

    setLoading(false);
  }

  async function handleVerifyEmail() {
    setError('');
    setSuccess('');

    if (!verificationCode || verificationCode.length < 6) {
      setError(t('auth.invalidCode', { defaultValue: 'Please enter a valid code' }));
      return;
    }

    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: user?.email,
      token: verificationCode,
      type: 'email'
    });

    if (verifyError) {
      setError(verifyError.message);
    } else {
      setSuccess(
        t('settings.emailVerified', {
          defaultValue: 'Email verified successfully!'
        })
      );
      await loadUser();
      setTimeout(() => {
        setShowVerifyEmailModal(false);
        setSuccess('');
      }, 2000);
    }

    setLoading(false);
  }

  async function handleChangeLanguage(lang: string) {
    await storage.setLanguage(lang);
    i18n.changeLanguage(lang);
    setShowLanguageModal(false);
  }

  async function handleChangeTheme(newTheme: 'light' | 'dark' | 'system') {
    await setTheme(newTheme);
    setShowThemeModal(false);
  }

  async function handleChangeRegion(reg: string) {
    await storage.setRegion(reg);
    setRegionLocale(reg);
    useGlobalStore.getState().setRegion(reg); // Sync to store
    setRegion(reg);
    setShowRegionModal(false);
  }

  async function handleLogout() {
    showAlert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('storage.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Sign out from components
            if (GoogleSignin) {
              await GoogleSignin.signOut();
            }
          } catch (error) {
            console.warn('Google Sign-Out Error:', error); // Changed to warn to avoid noise
          }

          // Clear Local Storage
          await AsyncStorage.multiRemove(['google_sheet_id', 'last_export_date']);

          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }
      }
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>
        </View>

        {/* User Details */}
        {isSettingVisible('userDetails') && (
          <Card>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={20} color={colors.icon} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.userDetails')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.icon }]}>{t('auth.email')}</Text>
                <Text style={[styles.value, { color: colors.text }]}>{user?.email}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Image
                    source={{
                      uri: 'https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png'
                    }}
                    style={{ width: 20, height: 20, resizeMode: 'contain' }}
                  />
                  <Text style={[styles.label, { color: colors.icon }]}>
                    {t('settings.googleSheets', {
                      defaultValue: 'Google Sheets'
                    })}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleGoogleSync} disabled={!!sheetId || loading} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: sheetId ? '#10B981' : colors.icon
                    }}
                  />
                  <Text
                    style={[
                      styles.value,
                      {
                        color: sheetId ? colors.text : colors.tint,
                        flex: 0,
                        fontWeight: sheetId ? '500' : '600'
                      }
                    ]}
                  >
                    {sheetId ? t('settings.synced', { defaultValue: 'Synced' }) : t('settings.connect', { defaultValue: 'Connect' })}
                  </Text>
                </TouchableOpacity>
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
                      {t('settings.verifyEmail', {
                        defaultValue: 'Verify Email'
                      })}
                    </Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>
                      {t('settings.emailNotVerified', {
                        defaultValue: 'Email not verified'
                      })}
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
          <TouchableOpacity
            onPress={() => {
              setShowPasswordModal(true);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setError('');
              setSuccess('');
            }}
          >
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Key size={20} color={colors.icon} />
                  <Text style={[styles.settingText, { color: colors.text }]}>{t('settings.changePassword')}</Text>
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
                    <Text style={[styles.settingText, { color: colors.text }]}>{t('settings.mfa')}</Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>{mfaFactors.length > 0 ? `${mfaFactors.length} ${t('mfa.devicesEnrolled')}` : t('settings.mfaNotEnabled')}</Text>
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
                    <Text style={[styles.settingText, { color: colors.text }]}>{t('settings.language')}</Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>{SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label || 'English'}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.icon} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Region */}
        {isSettingVisible('region') && (
          <TouchableOpacity onPress={() => setShowRegionModal(true)}>
            <Card>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <MapPin size={20} color={colors.icon} />
                  <View>
                    <Text style={[styles.settingText, { color: colors.text }]}>
                      {t('settings.regionCurrency', {
                        defaultValue: 'Region & Currency'
                      })}
                    </Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>{REGIONS.find((r) => r.code === region)?.label || 'United States'}</Text>
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
                    <Text style={[styles.settingText, { color: colors.text }]}>{t('settings.theme', { defaultValue: 'Theme' })}</Text>
                    <Text style={[styles.settingSubtext, { color: colors.icon }]}>
                      {theme === 'system'
                        ? t('settings.themes.system', {
                            defaultValue: 'System'
                          })
                        : theme === 'light'
                          ? t('settings.themes.light', {
                              defaultValue: 'Light'
                            })
                          : t('settings.themes.dark', { defaultValue: 'Dark' })}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.icon} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Logout */}
        {isSettingVisible('logout') && <Button title={t('auth.logout')} onPress={handleLogout} variant="outline" />}
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !passwordModalLoading && setShowPasswordModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.changePassword')}</Text>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)} disabled={passwordModalLoading}>
              <Text
                style={{
                  color: passwordModalLoading ? colors.icon : colors.tint
                }}
              >
                {t('settings.close')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {error && <Alert variant="error" message={error} />}
            {success && <Alert variant="success" message={success} />}

            <Input label={t('settings.currentPassword')} value={currentPassword} onChangeText={setCurrentPassword} placeholder={t('settings.enterCurrentPassword')} secureTextEntry autoComplete="off" textContentType="none" editable={!passwordModalLoading} />

            <Input label={t('settings.newPassword')} value={newPassword} onChangeText={setNewPassword} placeholder={t('settings.enterNewPassword')} secureTextEntry editable={!passwordModalLoading} />

            <Input label={t('settings.confirmNewPassword')} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('settings.confirmNewPasswordPlaceholder')} secureTextEntry editable={!passwordModalLoading} />

            <Button title={t('settings.updatePassword')} onPress={handleChangePassword} loading={passwordModalLoading} disabled={passwordModalLoading} />
          </View>

          {passwordModalLoading && (
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <View style={[styles.modalLoadingOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.modalLoadingText, { color: colors.text }]}>
                  {t('settings.updatingPassword', {
                    defaultValue: 'Updating password…'
                  })}
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Verify Email Modal */}
      <Modal visible={showVerifyEmailModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVerifyEmailModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.verifyEmail', { defaultValue: 'Verify Email' })}</Text>
            <TouchableOpacity onPress={() => setShowVerifyEmailModal(false)}>
              <Text style={{ color: colors.tint }}>{t('settings.close')}</Text>
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

            <Input label={t('auth.code', { defaultValue: 'Verification Code' })} value={verificationCode} onChangeText={setVerificationCode} placeholder="123456" keyboardType="numeric" />

            <Button title={t('settings.verifyCode', { defaultValue: 'Verify Code' })} onPress={handleVerifyEmail} loading={loading} />

            <Button
              title={
                resendCooldown > 0
                  ? t('settings.resendCodeWithTimer', {
                      defaultValue: `Resend Code (${resendCooldown}s)`,
                      seconds: resendCooldown
                    })
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
      <Modal visible={showMFAModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMFAModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('mfa.title')}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowMFAModal(false);
                loadMFAFactors();
              }}
            >
              <Text style={{ color: colors.tint }}>{t('settings.close')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <MFASetup onStatusChange={loadMFAFactors} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLanguageModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.language')}</Text>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <Text style={{ color: colors.tint }}>{t('settings.close')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  i18n.language === lang.code && {
                    backgroundColor: colors.tint
                  }
                ]}
                onPress={() => handleChangeLanguage(lang.code)}
              >
                <Text
                  style={[
                    styles.languageText,
                    {
                      color: i18n.language === lang.code ? '#fff' : colors.text
                    }
                  ]}
                >
                  {t(lang.i18nKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowThemeModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.theme', { defaultValue: 'Theme' })}</Text>
            <TouchableOpacity onPress={() => setShowThemeModal(false)}>
              <Text style={{ color: colors.tint }}>{t('settings.close')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {[
              {
                label: t('settings.themes.system', { defaultValue: 'System' }),
                value: 'system'
              },
              {
                label: t('settings.themes.light', { defaultValue: 'Light' }),
                value: 'light'
              },
              {
                label: t('settings.themes.dark', { defaultValue: 'Dark' }),
                value: 'dark'
              }
            ].map((option) => (
              <TouchableOpacity key={option.value} style={[styles.languageOption, theme === option.value && { backgroundColor: colors.tint }]} onPress={() => handleChangeTheme(option.value as 'light' | 'dark' | 'system')}>
                <Text style={[styles.languageText, { color: theme === option.value ? '#fff' : colors.text }]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Region Modal */}
      <Modal visible={showRegionModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRegionModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.regionCurrency', {
                defaultValue: 'Region & Currency'
              })}
            </Text>
            <TouchableOpacity onPress={() => setShowRegionModal(false)}>
              <Text style={{ color: colors.tint }}>{t('settings.close')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {REGIONS.map((reg) => (
              <TouchableOpacity key={reg.code} style={[styles.languageOption, region === reg.code && { backgroundColor: colors.tint }]} onPress={() => handleChangeRegion(reg.code)}>
                <Text style={[styles.languageText, { color: region === reg.code ? '#fff' : colors.text }]}>{reg.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold'
  },
  section: {
    gap: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    fontSize: 14
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right'
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500'
  },
  settingSubtext: {
    fontSize: 12,
    marginTop: 2
  },
  modalContainer: {
    flex: 1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  modalContent: {
    padding: 16
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16
  },
  languageOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  modalLoadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  modalLoadingText: {
    fontSize: 16,
    fontWeight: '500'
  }
});
