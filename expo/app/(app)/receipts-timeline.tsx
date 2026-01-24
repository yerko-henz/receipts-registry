import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useReceiptsStore } from '@/store/useReceiptsStore'
import { Receipt } from '@/services/receipts'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { useFocusEffect } from 'expo-router'
import { ArrowUpRight, Calendar, Store, Tag, TrendingUp, Filter } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View, Pressable, ScrollView } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'


export default function ReceiptsTimelineScreen() {
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

  // Group receipts by date
  const groupedReceipts = useMemo(() => {
    const groups: { title: string; data: Receipt[] }[] = []
    
    receipts.forEach((receipt) => {
      if (!receipt.transaction_date) return
      
      const date = parseISO(receipt.transaction_date)
      let title = format(date, 'MMMM d, yyyy')
      
      if (isToday(date)) title = 'Today'
      else if (isYesterday(date)) title = 'Yesterday'

      const existingGroup = groups.find(g => g.title === title)
      if (existingGroup) {
        existingGroup.data.push(receipt)
      } else {
        groups.push({ title, data: [receipt] })
      }
    })
    
    return groups
  }, [receipts])

  // Flatten for FlashList
  const listData = useMemo(() => {
    const flatList: (string | Receipt)[] = []
    groupedReceipts.forEach(group => {
      flatList.push(group.title) // Header
      flatList.push(...group.data) // Items
    })
    return flatList
  }, [groupedReceipts])

  const totalSpent = useMemo(() => {
    return receipts.reduce((sum, r) => sum + (r.total_amount ?? 0), 0)
  }, [receipts])

  const renderItem = ({ item }: { item: string | Receipt }) => {
    if (typeof item === 'string') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.icon }]}>{item}</Text>
        </View>
      )
    }

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
            <Store size={20} color={colors.tint} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.merchantName, { color: colors.text }]}>
              {item.merchant_name || 'Unknown Merchant'}
            </Text>
            <View style={styles.categoryBadge}>
                <Text style={[styles.category, { color: colors.icon }]}>
                 {item.category || 'Uncategorized'}
                </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: colors.text }]}>
            {item.currency} {(item.total_amount ?? 0).toFixed(2)}
          </Text>
          {(item.tax_amount ?? 0) > 0 && (
            <Text style={[styles.tax, { color: colors.icon }]}>
              Tax: {(item.tax_amount ?? 0).toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
             <Text style={[styles.headerTitle, { color: colors.text }]}>Timeline</Text>
             <Text style={[styles.headerSubtitle, { color: colors.icon }]}>Your spending history</Text>
        </View>
        <View style={styles.headerRight}>
             <View style={[styles.totalBadge, { backgroundColor: colors.tint + '20' }]}>
                 <TrendingUp size={16} color={colors.tint} />
                 <Text style={[styles.totalAmount, { color: colors.tint }]}>
                    ${totalSpent.toFixed(2)}
                 </Text>
             </View>
        </View>
      </View>

      <FlashList
        data={listData}
        renderItem={renderItem}
        getItemType={(item) => (typeof item === 'string' ? 'header' : 'row')}
        estimatedItemSize={80}
        keyExtractor={(item, index) => (typeof item === 'string' ? `header-${item}` : item.id)}
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
            <Text style={[styles.emptyText, { color: colors.text }]}>No receipts yet</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
  },
  headerSubtitle: {
       fontSize: 14,
       fontFamily: 'Manrope_500Medium',
       marginTop: 2,
  },
  headerRight: {
      alignItems: 'flex-end',
  },
  totalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
  },
  totalAmount: {
      fontSize: 16,
      fontFamily: 'Manrope_700Bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 4,
  },
  categoryBadge: {
      flexDirection: 'row',
  },
  category: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  tax: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
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
})
