import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useReceiptsStore } from '@/store/useReceiptsStore'
import { Receipt } from '@/services/receipts'
import { format } from 'date-fns'
import { useFocusEffect } from 'expo-router'
import { ArrowUpRight, Calendar, Store, Tag, Filter, Search, ChevronDown, ChevronUp, DollarSign } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View, Pressable, TextInput, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function ReceiptsDashboardScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const { receipts, fetchReceipts, isLoading } = useReceiptsStore()
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const filters = ['All', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping']

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const matchesFilter = activeFilter === 'All' || (r.category && r.category.includes(activeFilter))
      const matchesSearch = searchQuery === '' || 
                            (r.merchant_name && r.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesFilter && matchesSearch
    })
  }, [receipts, activeFilter, searchQuery])

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  }

  const renderItem = ({ item }: { item: Receipt }) => {
    const isExpanded = expandedId === item.id;

    return (
      <Pressable 
        style={[
            styles.card, 
            { backgroundColor: colors.card, borderColor: isExpanded ? colors.tint : colors.border }
        ]}
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.cardMain}>
            <View style={styles.cardLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                    <Store size={20} color={colors.icon} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.merchantName, { color: colors.text }]}>
                    {item.merchant_name || 'Unknown Merchant'}
                    </Text>
                    <Text style={[styles.date, { color: colors.icon }]}>
                        {item.transaction_date ? format(new Date(item.transaction_date), 'MMM d, yyyy') : 'No date'}
                    </Text>
                </View>
            </View>
            <View style={styles.cardRight}>
                 <Text style={[styles.amount, { color: colors.text }]}>
                    {item.currency} {(item.total_amount ?? 0).toFixed(2)}
                 </Text>
                 {isExpanded ? <ChevronUp size={16} color={colors.icon} /> : <ChevronDown size={16} color={colors.icon} />}
            </View>
        </View>

        {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.icon }]}>Category</Text>
                    <View style={[styles.categoryPill, { backgroundColor: colors.tint + '15' }]}>
                        <Text style={[styles.categoryText, { color: colors.tint }]}>{item.category || 'None'}</Text>
                    </View>
                </View>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.icon }]}>Tax</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                        {item.currency} {(item.tax_amount ?? 0).toFixed(2)}
                    </Text>
                </View>
                 {/* Placeholder for items - simply showing count for now if available, or just a button */}
                <Pressable style={[styles.actionButton, { backgroundColor: colors.text }]}>
                    <Text style={[styles.actionButtonText, { color: colors.background }]}>View Full Details</Text>
                </Pressable>
            </View>
        )}
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
         <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard</Text>
      </View>

      <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
              <Search size={20} color={colors.icon} />
              <TextInput 
                  placeholder="Search merchant..." 
                  placeholderTextColor={colors.icon}
                  style={[styles.searchInput, { color: colors.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
              />
          </View>
      </View>

      <View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.filterContainer}
          >
            {filters.map(filter => (
                <Pressable 
                    key={filter} 
                    style={[
                        styles.filterChip, 
                        { 
                            backgroundColor: activeFilter === filter ? colors.tint : colors.card,
                            borderColor: activeFilter === filter ? colors.tint : colors.border
                        }
                    ]}
                    onPress={() => setActiveFilter(filter)}
                >
                    <Text style={[
                        styles.filterText, 
                        { color: activeFilter === filter ? '#FFF' : colors.text }
                    ]}>
                        {filter}
                    </Text>
                </Pressable>
            ))}
          </ScrollView>
      </View>

      <FlashList
        data={filteredReceipts}
        renderItem={renderItem}
        estimatedItemSize={70}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
         ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>No receipts found</Text>
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
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
  },
  searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
  },
  searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 10,
  },
  searchInput: {
      flex: 1,
      fontFamily: 'Manrope_500Medium',
      fontSize: 16,
  },
  filterContainer: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 8,
  },
  filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
  },
  filterText: {
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
      flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  cardRight: {
      alignItems: 'flex-end',
      gap: 4,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
  },
  expandedContent: {
      padding: 16,
      paddingTop: 0,
      borderTopWidth: 1,
      borderTopColor: 'transparent', // controlled by style prop
  },
  detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
  },
  detailLabel: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
  },
  detailValue: {
      fontSize: 14,
      fontFamily: 'Manrope_600SemiBold',
  },
  categoryPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
  },
  categoryText: {
      fontSize: 12,
      fontFamily: 'Manrope_600SemiBold',
  },
  actionButton: {
      marginTop: 16,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
  },
  actionButtonText: {
      fontFamily: 'Manrope_700Bold',
      fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
})
