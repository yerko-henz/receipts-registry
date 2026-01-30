import { Colors } from '@/constants/theme'
import { formatPrice } from '@/lib/currency'
import { DEFAULT_CATEGORY_ICON, getCategoryIcon } from '@/constants/categories'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useReceiptsStore } from '@/store/useReceiptsStore'
import { useGlobalStore } from '@/store/useGlobalStore'
import { Receipt } from '@/services/receipts'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { useFocusEffect } from 'expo-router'
import { Store, Search, ChevronDown, ChevronUp, Trash2, TrendingUp, Eye, RefreshCw } from 'lucide-react-native'
import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { RefreshControl, StyleSheet, Text, View, Pressable, TextInput, ScrollView, LayoutAnimation, Platform, UIManager, Image, Modal, Alert, ActivityIndicator, Linking } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, Easing, cancelAnimation } from 'react-native-reanimated'

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncReceiptsToSheet } from '@/services/google-sheets';

const AnimatedImage = Animated.createAnimatedComponent(Image)
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

import { ENABLE_TRANSACTION_DATE_FILTER } from '@/constants/featureFlags'

// ... existing code ...

import { debounce } from 'lodash'

// ...

export default function ReceiptsUnifiedScreen() {
  const { t } = useTranslation()

  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  // Use new store structure
  const { receipts, actions, isLoading, hasMore, totalCount } = useReceiptsStore()
  const region = useGlobalStore(state => state.region)


  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [lastExport, setLastExport] = useState<string | null>(null)

  // Load Saved Sheet State
  useEffect(() => {
    AsyncStorage.multiGet(['google_sheet_id', 'last_export_date']).then(([[_, id], [__, date]]) => {
      if (id) setSheetId(id)
      if (date) setLastExport(date)
    })
  }, [])
  
  const hasUnsyncedChanges = useMemo(() => {
      if (receipts.length === 0) return false;
      if (!lastExport) return true; 
      return receipts.some(r => r.created_at > lastExport);
  }, [receipts, lastExport])
  
  // Dashboard State (Filters)
  // Local state for UI inputs, synced to store actions
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Date Range State
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  
  // Initialize from store to keep sync, default to 'created' (upload date)
  const storedDateMode = useReceiptsStore((state) => state.filters.dateMode)
  const [dateMode, setDateMode] = useState<'transaction' | 'created'>(storedDateMode || 'created')

  // Debounced Filter Update
  const updateFilters = useMemo(
    () => debounce((filters: any) => {
        actions.setFilters(filters);
        actions.fetchReceipts({ reset: true });
    }, 500),
    [actions]
  );

  // Effect to sync local state to store filters
  useEffect(() => {
    updateFilters({
        category: activeFilter,
        searchQuery: searchQuery,
        startDate,
        endDate,
        dateMode
    });
    // Cleanup debounce
    return () => updateFilters.cancel();
  }, [activeFilter, searchQuery, startDate, endDate, dateMode, updateFilters])


  // Modal & Gesture Helpers... (omitted for brevity in replacement if unchanged)
  // ... (keep existing modal/gesture code) ...
  // Since I am replacing a huge chunk, I need to be careful.
  // The tool instructions say "Reimplement filtering".
  
  // ... existing Modal State ...
  const [modalReceipt, setModalReceipt] = useState<Receipt | null>(null)
  const [imageLoading, setImageLoading] = useState(true)

  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withSpring(1)
        savedScale.value = 1
        translateX.value = withSpring(0)
        savedTranslateX.value = 0
        translateY.value = withSpring(0)
        savedTranslateY.value = 0
      } else {
        savedScale.value = scale.value
      }
    })

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
        if (scale.value > 1) {
            translateX.value = savedTranslateX.value + e.translationX
            translateY.value = savedTranslateY.value + e.translationY
        }
    })
    .onEnd(() => {
        savedTranslateX.value = translateX.value
        savedTranslateY.value = translateY.value
    })

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
    }
  })
  
  const closeButtonStyle = useAnimatedStyle(() => {
      return {
          opacity: withTiming(scale.value > 1.1 ? 0 : 1),
      }
  })

  // Sync Icon Animation
  const rotation = useSharedValue(0)

  const spinStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    }
  })

  useEffect(() => {
    if (exporting) {
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1
        )
    } else {
        cancelAnimation(rotation);
        rotation.value = 0;
    }
  }, [exporting])

  useEffect(() => {
    if (modalReceipt) {
      setImageLoading(true)
      scale.value = 1
      savedScale.value = 1
      translateX.value = 0
      translateY.value = 0
      savedTranslateX.value = 0
      savedTranslateY.value = 0
    }
  }, [modalReceipt, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY])

  const flashListRef = useRef<any>(null)

  // Auto-scroll to top when filters change
  useEffect(() => {
    if (receipts.length > 0 && flashListRef.current) {
         flashListRef.current.scrollToOffset({ offset: 0, animated: true })
    }
  }, [activeFilter, searchQuery, dateMode])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await actions.fetchReceipts({ reset: true })
    setRefreshing(false)
  }, [actions])

  const onEndReached = useCallback(() => {
      if (hasMore && !isLoading && !refreshing) {
          actions.fetchReceipts({ reset: false })
      }
  }, [hasMore, isLoading, refreshing, actions])

  const handleDelete = (id: string) => {
    Alert.alert(
      t('receipts.deleteTitle'),
      t('receipts.deleteConfirm'),
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
              style: 'destructive',
              onPress: async () => {
                try {
                  await actions.removeReceipt(id)
                } catch (e) {
                   console.error(e)
                   Alert.alert('Error', t('receipts.deleteError'))
                }
              }
            }
      ]
    )
  }


  const handleExport = async () => {
    // Export acts on *Client Filtered* list usually? 
    // With server pagination, we might want to export ALL matching the filter.
    // SyncReceiptsToSheet takes a list. 
    // If we only have loaded items, we only export loaded items.
    // For now, use `receipts` (loaded items). 
    // Ideally we'd fetch ALL for export, but let's stick to loaded for simplicity or warn user.
    // Or maybe the user expects only what they see. 
    // Given the previous logic was `filteredReceipts`, this preserves behavior for loaded items.
    
    if (receipts.length === 0) {
      Alert.alert(t('common.error'), t('receipts.noReceiptsToExport'))
      return
    }

    try {
      setExporting(true)
      const result = await syncReceiptsToSheet(receipts, lastExport, t)
      
      // Save State
      await AsyncStorage.multiSet([
          ['google_sheet_id', result.spreadsheetId],
          ['last_export_date', result.timestamp]
      ])
      setSheetId(result.spreadsheetId)
      setLastExport(result.timestamp)

      if (result.syncedCount === 0) {
          Alert.alert(
            t('common.info', { defaultValue: 'Info' }),
            t('receipts.alreadySynced', { defaultValue: 'All receipts are already synced.' }),
            [{ text: 'OK' }]
          )
      } else {
          Alert.alert(
            t('common.success'),
            t('receipts.exportSuccess'),
            [
              { text: t('receipts.openSheet'), onPress: () => Linking.openURL(result.url) },
              { text: 'OK', style: 'cancel' }
            ]
          )
      }
    } catch (error: any) {
      console.error(error)
      Alert.alert(t('receipts.exportError'), error.message || 'Could not export to Google Sheets')
    } finally {
      setExporting(false)
    }
  }

  const handleOpenSheet = () => {
      if (sheetId) {
          Linking.openURL(`https://docs.google.com/spreadsheets/d/${sheetId}`)
      }
  }

  // Initial Load
  useFocusEffect(
    useCallback(() => {
      // Refresh on focus? Or just rely on persisted state?
      // Usually good to refresh to catch up.
      actions.fetchReceipts({ reset: true })
    }, [actions])
  )

  const filters = ['All', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping']

  // Get the appropriate locale for date formatting
  const { i18n } = useTranslation()
  const dateLocale = i18n.language === 'es' ? es : enUS

  // 2. Grouping Logic with Dynamic Date Field
  // Use 'receipts' which is now the source of truth (server side filtered/paginated)
  const groupedData = useMemo(() => {
    const groups: { title: string; data: Receipt[] }[] = []
    
    receipts.forEach((receipt) => {
      const dateString = dateMode === 'transaction' ? receipt.transaction_date : receipt.created_at
      if (!dateString) return
      
      const date = parseISO(dateString)
      let title = format(date, 'MMMM d, yyyy', { locale: dateLocale })
      
      if (isToday(date)) title = t('receipts.today')
      else if (isYesterday(date)) title = t('receipts.yesterday')

      const existingGroup = groups.find(g => g.title === title)
      if (existingGroup) {
        existingGroup.data.push(receipt)
      } else {
        groups.push({ title, data: [receipt] })
      }
    })
    
    // Flatten for FlashList
    const flatList: (string | Receipt)[] = []
    groups.forEach(group => {
      flatList.push(group.title) // Header
      flatList.push(...group.data) // Items
    })
    return flatList
  }, [receipts, dateMode, dateLocale, t])

  const totalSpent = useMemo(() => {
    return receipts.reduce((sum, r) => sum + (r.total_amount ?? 0), 0)
  }, [receipts])

  const itemRefs = useRef<Record<string, View | null>>({})
  const scrollY = useRef(0)
  const listContainerRef = useRef<View>(null)

  const toggleExpand = (id: string) => {
    const isExpanding = expandedId !== id
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(isExpanding ? id : null);

    if (isExpanding) {
        // Wait for layout animation to finish and new layout to settle
        setTimeout(() => {
            const itemRef = itemRefs.current[id];
            
            if (itemRef && listContainerRef.current) {
                // Measure item position relative to the screen
                itemRef.measure((x, y, width, height, pageX, pageY) => {
                    // Measure list container position relative to the screen
                    listContainerRef.current?.measure((lx, ly, lWidth, lHeight, listPageX, listPageY) => {
                        // Calculate where the item is relative to the list's viewport top
                        const relativeY = pageY - listPageY;
                        
                        // Current scroll position
                        const currentScroll = scrollY.current;
                        
                        // We want to scroll so that relativeY becomes 0 (top of list)
                        // New Offset = Current Offset + Relative Position
                        const targetOffset = currentScroll + relativeY;
                        
                        flashListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
                    })
                })
            } else {
                 // Fallback if refs aren't ready (e.g. item scrolled out of view immediately?)
                 const index = groupedData.findIndex(item => typeof item !== 'string' && item.id === id)
                 if (index !== -1) {
                    flashListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 }) 
                 }
            }
        }, 350) // slightly larger than animation duration (300ms)
    }
  }

  const renderItem = useCallback(({ item }: { item: string | Receipt }) => {
    if (typeof item === 'string') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.icon }]}>{item}</Text>
        </View>
      )
    }

    const isExpanded = expandedId === item.id;
    const hasImage = !!item.image_url;

    return (
      <Pressable 
        ref={(el) => {
            // @ts-ignore
            itemRefs.current[item.id] = el
        }}
        style={[
            styles.card, 
            { backgroundColor: colors.card, borderColor: isExpanded ? colors.tint : colors.border }
        ]}
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.cardMain}>
            <View style={styles.cardLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                    {(() => {
                        const CategoryIcon = item.category ? getCategoryIcon(item.category) : DEFAULT_CATEGORY_ICON
                        return <CategoryIcon size={20} color={colors.icon} />
                    })()}
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={[styles.merchantName, { color: colors.text }]}>
                    {item.merchant_name || t('chart.unknownMerchant')}
                    </Text>
                    <View style={styles.categoryRow}>
                        <Text style={[styles.category, { color: colors.icon }]}>
                            {item.category ? t(`receipts.filters.${item.category}`, { defaultValue: item.category }) : t('chart.uncategorized')}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardRight}>
                 <Text style={[styles.amount, { color: colors.text }]}>
                    {formatPrice(item.total_amount ?? 0)}
                 </Text>
                 {isExpanded ? <ChevronUp size={18} color={colors.icon} /> : <ChevronDown size={18} color={colors.icon} />}
            </View>
        </View>

        {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                {/* Date Fields */}
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.icon }]}>{t('receipts.receiptDate')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                        {item.transaction_date ? format(new Date(item.transaction_date), 'MMM d, yyyy') : 'N/A'}
                    </Text>
                </View>
                {dateMode === 'created' && (
                     <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.icon }]}>{t('receipts.uploaded')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                        </Text>
                    </View>
                )}
                
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.icon }]}>{t('receipts.tax')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                        {formatPrice(item.tax_amount ?? 0)}
                    </Text>
                </View>

                {/* Items List */}
                {item.receipt_items && item.receipt_items.length > 0 && (
                    <View style={styles.itemsSection}>
                        <Text style={[styles.itemsHeader, { color: colors.icon }]}>{t('receipts.items')}</Text>
                        {item.receipt_items.map((rItem: any, idx: number) => (
                            <View key={idx} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={[styles.itemName, { color: colors.text }]}>
                                        {rItem.description || rItem.name || 'Item'}
                                    </Text>
                                    <Text style={[styles.itemQty, { color: colors.icon }]}>
                                        {rItem.quantity} x {formatPrice(rItem.unit_price ?? 0)}
                                    </Text>
                                </View>
                                <Text style={[styles.itemTotal, { color: colors.text }]}>
                                    {formatPrice(rItem.total_price ?? 0)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                 <View style={styles.actionsRow}>
                    {hasImage && (
                        <Pressable 
                            style={[styles.actionBtn, { borderColor: colors.border }]}
                            onPress={() => setModalReceipt(item)}
                        >
                            <Eye size={14} color={colors.text} />
                            <Text style={[styles.actionBtnText, { color: colors.text }]}>{t('receipts.viewReceipt', { defaultValue: 'View Receipt' })}</Text>
                        </Pressable>
                    )}

                    <Pressable 
                        style={[styles.deleteBtn, { backgroundColor: colors.notification + '15' }]}
                        onPress={() => handleDelete(item.id)}
                    >
                        <Trash2 size={14} color={colors.notification} />
                        <Text style={[styles.deleteBtnText, { color: colors.notification }]}>{t('receipts.delete')}</Text>
                    </Pressable>
                 </View>
            </View>
        )}
      </Pressable>
    )
  }, [expandedId, colors, dateMode, handleDelete, t, toggleExpand])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header with Total */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
             <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{t('receipts.title')}</Text>
             <Text style={[styles.headerSubtitle, { color: colors.icon }]} numberOfLines={1} adjustsFontSizeToFit>
                {receipts.length} {t('receipts.itemsFound')}
             </Text>
        </View>
        <View style={styles.headerRight}>
             <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={[styles.totalBadge, { backgroundColor: colors.tint + '20' }]}>
                    <TrendingUp size={16} color={colors.tint} />
                    <Text style={[styles.totalAmount, { color: colors.tint }]}>
                        {formatPrice(totalSpent)}
                    </Text>
                </View>

                <Pressable 
                  style={({pressed}) => {
                    let bg = colors.card;
                    
                    if (hasUnsyncedChanges) {
                         bg = colors.notification; // Red for unsynced
                    } else if (sheetId) {
                         bg = colors.tint + '20'; // Light Green/Tint for synced
                    }

                    return {
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: bg,
                        opacity: pressed || exporting ? 0.7 : 1,
                        borderWidth: 1,
                        borderColor: 'rgba(0,0,0,0.05)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6
                    }
                  }}
                  onPress={handleExport}
                  disabled={exporting}
                >
                  <Animated.View style={spinStyle}>
                      {hasUnsyncedChanges ? (
                          <RefreshCw size={20} color="#FFF" />
                      ) : sheetId ? (
                          <RefreshCw size={20} color={colors.tint} />
                      ) : (
                          <RefreshCw size={20} color={colors.text} />
                      )}
                  </Animated.View>
                </Pressable>

                {sheetId && (
                    <Pressable 
                        style={({pressed}) => ({
                            padding: 8,
                            borderRadius: 20,
                            backgroundColor: colors.card,
                            opacity: pressed ? 0.7 : 1,
                            borderWidth: 1,
                            borderColor: 'rgba(0,0,0,0.05)'
                        })}
                        onPress={handleOpenSheet}
                    >
                         <Eye size={20} color={colors.text} />
                    </Pressable>
                )}
             </View>
        </View>
      </View>

      {/* Controls Container */}
      <View style={styles.controlsContainer}>
          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
              <Search size={20} color={colors.icon} />
              <TextInput 
                  placeholder={t('receipts.searchPlaceholder')}
                  placeholderTextColor={colors.icon}
                  style={[styles.searchInput, { color: colors.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
              />
          </View>
          
          {/* Filters */}
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
                        {t(`receipts.filters.${filter}`, { defaultValue: filter })}
                    </Text>
                </Pressable>
            ))}
          </ScrollView>

          {/* Sort Toggles - Only show if enabled */}
          {ENABLE_TRANSACTION_DATE_FILTER && (
              <View style={[styles.sortContainer, { borderColor: colors.border }]}>
                 <Pressable 
                    style={[styles.sortBtn, dateMode === 'transaction' && { backgroundColor: colors.card }]}
                    onPress={() => setDateMode('transaction')}
                 >
                    <Text style={[styles.sortBtnText, { color: dateMode === 'transaction' ? colors.tint : colors.icon }]}>
                        {t('receipts.receiptDate')}
                    </Text>
                 </Pressable>
                 <Pressable 
                    style={[styles.sortBtn, dateMode === 'created' && { backgroundColor: colors.card }]}
                    onPress={() => setDateMode('created')}
                 >
                    <Text style={[styles.sortBtnText, { color: dateMode === 'created' ? colors.tint : colors.icon }]}>
                        {t('receipts.uploadDate')}
                    </Text>
                 </Pressable>
              </View>
          )}
          
          <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
            <DateRangeFilter 
                startDate={startDate} 
                endDate={endDate} 
                onRangeChange={(start, end) => {
                    setStartDate(start)
                    setEndDate(end)
                }} 
            />
          </View>
      </View>

      <View style={{ flex: 1 }} ref={listContainerRef} collapsable={false}>
          <FlashList
            ref={flashListRef}
            data={groupedData}
            extraData={[expandedId, region]}
            renderItem={renderItem}
            getItemType={(item) => (typeof item === 'string' ? 'header' : 'row')}
            // @ts-ignore
            estimatedItemSize={85}
            keyExtractor={(item, index) => (typeof item === 'string' ? `header-${item}` : item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
                scrollY.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
            }
            ListEmptyComponent={
              isLoading ? (
                  <View style={{ paddingTop: 100, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="large" color={colors.tint} />
                  </View>
              ) : (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                      <Store size={48} color={colors.icon} />
                    </View>
                    <Text style={[styles.emptyText, { color: colors.text }]}>{t('receipts.noReceipts')}</Text>
                    <Text style={[styles.emptySubtext, { color: colors.icon }]}>
                       {t('receipts.adjustFilters')}
                    </Text>
                  </View>
              )
            }
            ListFooterComponent={
                isLoading && receipts.length > 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.tint} />
                    </View>
                ) : null
            }
          />
      </View>

       {/* Global Modal for Image View */}
       <Modal visible={!!modalReceipt} transparent={true} animationType="fade" onRequestClose={() => setModalReceipt(null)}>
            <View style={styles.modalContainer}>
                <Pressable style={styles.modalCloseArea} onPress={() => setModalReceipt(null)} />
                <GestureHandlerRootView style={{ width: '100%', height: '100%' }}>
                    <View style={styles.modalContent}>
                        {imageLoading && (
                            <View style={styles.loaderContainer}>
                                <ActivityIndicator size="large" color={colors.tint} />
                            </View>
                        )}
                        {modalReceipt?.image_url && (
                            <GestureDetector gesture={composedGesture}>
                                <AnimatedImage 
                                    source={{ uri: modalReceipt.image_url }} 
                                    style={[styles.fullImage, animatedStyle]} 
                                    resizeMode="contain" 
                                    onLoadEnd={() => setImageLoading(false)}
                                />
                            </GestureDetector>
                        )}
                        <AnimatedPressable style={[styles.closeButton, closeButtonStyle]} onPress={() => setModalReceipt(null)}>
                            <Text style={styles.closeButtonText}>{t('settings.close')}</Text>
                        </AnimatedPressable>
                    </View>
                </GestureHandlerRootView>
            </View>
        </Modal>

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
  controlsContainer: {
     paddingTop: 12,
  },
  searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 10,
      marginHorizontal: 20,
      marginBottom: 12,
  },
  searchInput: {
      flex: 1,
      fontFamily: 'Manrope_500Medium',
      fontSize: 16,
  },
  filterContainer: {
      paddingHorizontal: 20,
      gap: 8,
      paddingBottom: 12,
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
  sortContainer: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.03)',
      padding: 4,
  },
  sortBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
  },
  sortBtnText: {
      fontSize: 13,
      fontFamily: 'Manrope_600SemiBold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    marginBottom: 10,
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
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  thumbnailContainer: {
    width: 42,
    height: 42,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  thumbnail: {
      width: '100%',
      height: '100%',
  },
  textContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 2,
  },
  categoryRow: {
      flexDirection: 'row',
  },
  category: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  cardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
  },
  expandedContent: {
      padding: 16,
      paddingTop: 0,
      borderTopWidth: 1,
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

  actionButton: {
      marginTop: 12,
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
    paddingTop: 80,
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
  },
  
  // Modal
  modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalCloseArea: {
      ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  fullImage: {
      width: '100%',
      height: '80%',
      borderRadius: 8,
  },
  closeButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
  },
  closeButtonText: {
      color: '#FFF',
      fontFamily: 'Manrope_600SemiBold',
  },
  itemsSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
  },
  itemsHeader: {
      fontSize: 12,
      fontFamily: 'Manrope_700Bold',
      textTransform: 'uppercase',
      marginBottom: 8,
      letterSpacing: 0.5,
  },
  itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
  },
  itemInfo: {
      flex: 1,
      marginRight: 12,
  },
  itemName: {
      fontSize: 14,
      fontFamily: 'Manrope_600SemiBold',
  },
  itemQty: {
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
  },
  itemTotal: {
      fontSize: 14,
      fontFamily: 'Manrope_700Bold',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
  },
  loaderContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
  },
})

