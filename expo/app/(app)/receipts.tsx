import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useReceiptsStore } from '@/store/useReceiptsStore'
import { format } from 'date-fns'
import { useFocusEffect } from 'expo-router'
import { ArrowUpRight, Calendar, Store, Tag } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ReceiptsScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const { receipts, fetchReceipts, isLoading } = useReceiptsStore()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchReceipts()
    setRefreshing(false)
  }, [fetchReceipts])

  useFocusEffect(
    useCallback(() => {
      fetchReceipts()
    }, [fetchReceipts])
  )

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.merchantContainer}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Store size={20} color={colors.tint} />
          </View>
          <View>
            <Text style={[styles.merchantName, { color: colors.text }]}>{item.merchant_name || 'Unknown Merchant'}</Text>
            <Text style={[styles.category, { color: colors.icon }]}>{item.category || 'Uncategorized'}</Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: colors.text }]}>
            {item.currency} {item.total?.toFixed(2)}
          </Text>
        </View>
      </View>
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Calendar size={14} color={colors.icon} />
          <Text style={[styles.date, { color: colors.icon }]}>
            {item.transaction_date ? format(new Date(item.transaction_date), 'MMM d, yyyy') : 'No date'}
          </Text>
        </View>
        {item.tax_amount > 0 && (
          <View style={styles.footerItem}>
            <Tag size={14} color={colors.icon} />
            <Text style={[styles.date, { color: colors.icon }]}>
              Tax: {item.currency} {item.tax_amount?.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Receipts</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          {receipts.length} total receipts
        </Text>
      </View>

      <FlashList
        data={receipts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
              <Store size={48} color={colors.icon} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>No receipts found</Text>
            <Text style={[styles.emptySubtext, { color: colors.icon }]}>
              Scanned receipts will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // Can add border if needed
  },
  title: {
    fontSize: 32,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Space for tab bar
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  merchantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  merchantName: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 12,
    opacity: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
})
