import ReceiptActivityChart from '@/components/ReceiptActivityChart'
import CategoryBreakdown from '@/components/CategoryBreakdown'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useReceiptsStore } from '@/store/useReceiptsStore'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { groupReceiptsByDay } from '@/lib/date'

export default function HomeScreen() {
  const { t, i18n } = useTranslation()
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const user = useGlobalStore((state) => state.user)
  const receipts = useReceiptsStore((state) => state.receipts)
  const isLoading = useReceiptsStore((state) => state.isLoading)
  const fetchReceipts = useReceiptsStore((state) => state.fetchReceipts)

  // Refetch receipts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchReceipts()
        .then(() => console.log(`[Home] Fetched receipts`))
        .catch((err) => console.error('[Home] Failed to fetch receipts:', err))
    }, [fetchReceipts])
  )

  // Compute daily data buckets for the chart and breakdown (Write Once, Read Many)
  const dailyData = useMemo(() => {
     const data = groupReceiptsByDay(receipts, i18n.language);
     console.log('[Home] Daily Data Groups:', JSON.stringify(data, null, 2));
     return data;
  }, [receipts, i18n.language]);

  const receiptsLoadedCount = useMemo(() => {
      return dailyData.reduce((acc, day) => acc + day.count, 0);
  }, [dailyData]);

  const getDaysSinceRegistration = () => {
    if (!user?.created_at) return 0
    const today = new Date()
    const created = new Date(user.created_at)
    const diffTime = Math.abs(today.getTime() - created.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  if (isLoading && receipts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('home.welcome')}, {user?.email?.split('@')[0]}! 👋
          </Text>
          <Text style={[styles.secondaryTitle, { color: colors.text }]}>
            {t('home.recentReceipts', { count: receiptsLoadedCount, days: dailyData.length })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {t('home.memberSince', { days: getDaysSinceRegistration(), company: process.env.EXPO_PUBLIC_COMPANY_NAME })}
          </Text>
        </View>

        <View style={{ marginBottom: 24, marginTop: 12 }}>
          <ReceiptActivityChart data={dailyData} />
        </View>

        <View style={{ marginBottom: 24 }}>
          <CategoryBreakdown data={dailyData} />
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