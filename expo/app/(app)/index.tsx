import ReceiptActivityChart from '@/components/ReceiptActivityChart'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useReceiptsStore } from '@/store/useReceiptsStore'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const DAYS_TO_SHOW = 9;

export default function HomeScreen() {
  const { t } = useTranslation()
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const user = useGlobalStore((state) => state.user)
  const receipts = useReceiptsStore((state) => state.receipts)
  const fetchReceipts = useReceiptsStore((state) => state.fetchReceipts)

  // Refetch receipts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchReceipts()
        .then(() => console.log(`[Home] Fetched receipts`))
        .catch((err) => console.error('[Home] Failed to fetch receipts:', err))
    }, [fetchReceipts])
  )

  const receiptsLoadedCount = receipts.filter(r => {
    const rawDate = (r as any).created_at || r.transaction_date;
    if (!rawDate) return false;
    const date = new Date(rawDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= (DAYS_TO_SHOW - 1); // 0 to 6 is 7 days
  }).length;

  const getDaysSinceRegistration = () => {
    if (!user?.created_at) return 0
    const today = new Date()
    const created = new Date(user.created_at)
    const diffTime = Math.abs(today.getTime() - created.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('home.welcome')}, {user?.email?.split('@')[0]}! 👋
          </Text>
          <Text style={[styles.secondaryTitle, { color: colors.text }]}>
            {t('home.recentReceipts', { count: receiptsLoadedCount, days: DAYS_TO_SHOW })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {t('home.memberSince', { days: getDaysSinceRegistration(), company: process.env.EXPO_PUBLIC_COMPANY_NAME })}
          </Text>
        </View>

        <View style={{ marginBottom: 24, marginTop: 12 }}>
          <ReceiptActivityChart receipts={receipts} days={DAYS_TO_SHOW} />
        </View>
      </ScrollView>
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
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 8,
  },
  secondaryTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardText: {
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
})