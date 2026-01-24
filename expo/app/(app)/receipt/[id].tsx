import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useReceiptsStore } from '@/store/useReceiptsStore'
import { getReceiptById, Receipt } from '@/services/receipts'
import { format } from 'date-fns'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Calendar, Store, Tag, Receipt as ReceiptIcon, Trash2, Share2, Image as ImageIcon } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View, Pressable, ScrollView, Alert, Image, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const { removeReceipt } = useReceiptsStore()
  
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageModalVisible, setImageModalVisible] = useState(false)

  useEffect(() => {
    fetchReceipt()
  }, [id])

  const fetchReceipt = async () => {
    try {
      if (!id) return
      const data = await getReceiptById(id)
      console.log('[ReceiptDetail] Fetched:', JSON.stringify(data, null, 2))
      setReceipt(data)
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'Failed to load receipt details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Receipt',
      'Are you sure you want to delete this receipt? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await removeReceipt(id)
                router.back()
              }
            } catch (e) {
               console.error(e)
               Alert.alert('Error', 'Failed to delete receipt')
            }
          }
        }
      ]
    )
  }

  if (loading) {
    return (
        <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.tint} />
        </View>
    )
  }

  if (!receipt) {
    return (
        <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
            <Text style={{ color: colors.text }}>Receipt not found</Text>
        </View>
    )
  }

  const items = (receipt as any).receipt_items || []
  const hasImage = !!receipt.image_url

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Receipt Details</Text>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Trash2 size={24} color={colors.tabIconDefault} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
          {/* Main Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
             <View style={styles.cardHeader}>
                 <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
                     <Store size={24} color={colors.tint} />
                 </View>
                 <View style={styles.headerText}>
                     <Text style={[styles.merchantName, { color: colors.text }]}>{receipt.merchant_name || 'Unknown'}</Text>
                     <Text style={[styles.date, { color: colors.icon }]}>
                        {receipt.transaction_date ? format(new Date(receipt.transaction_date), 'MMMM d, yyyy h:mm a') : 'No Date'}
                     </Text>
                 </View>
             </View>
             
             <View style={[styles.divider, { backgroundColor: colors.border }]} />
             
             <View style={styles.amountSection}>
                 <Text style={[styles.totalLabel, { color: colors.icon }]}>Total Amount</Text>
                 <Text style={[styles.totalAmount, { color: colors.text }]}>
                    {receipt.currency} {(receipt.total_amount ?? 0).toFixed(2)}
                 </Text>
             </View>
          </View>

          {/* Details Grid */}
          <View style={styles.grid}>
              <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Tag size={20} color={colors.icon} style={styles.gridIcon} />
                  <Text style={[styles.gridLabel, { color: colors.icon }]}>Category</Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>{receipt.category || 'None'}</Text>
              </View>
               <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ReceiptIcon size={20} color={colors.icon} style={styles.gridIcon} />
                  <Text style={[styles.gridLabel, { color: colors.icon }]}>Tax</Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>
                    {receipt.currency} {(receipt.tax_amount ?? 0).toFixed(2)}
                  </Text>
              </View>
          </View>

          {/* Image Section */}
          {hasImage && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Receipt Image</Text>
                  <Pressable onPress={() => setImageModalVisible(true)} style={styles.imagePreview}>
                      <Image source={{ uri: receipt.image_url! }} style={styles.image} resizeMode="cover" />
                      <View style={styles.imageOverlay}>
                          <ImageIcon size={24} color="#FFF" />
                          <Text style={styles.viewImageText}>View Full Image</Text>
                      </View>
                  </Pressable>
              </View>
          )}

          {/* Items Section */}
          {items.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Items ({items.length})</Text>
                  <View style={styles.itemsList}>
                      {items.map((item: any, index: number) => (
                          <View key={index} style={[styles.itemRow, index < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                              <View style={styles.itemInfo}>
                                  <Text style={[styles.itemName, { color: colors.text }]}>{item.description || item.name || 'Item'}</Text>
                                  <Text style={[styles.itemQty, { color: colors.icon }]}>
                                      {item.quantity} x {receipt.currency}{(item.unit_price ?? 0).toFixed(2)}
                                  </Text>
                              </View>
                              <Text style={[styles.itemTotal, { color: colors.text }]}>
                                  {receipt.currency}{(item.total_price ?? 0).toFixed(2)}
                              </Text>
                          </View>
                      ))}
                  </View>
              </View>
          )}

      </ScrollView>

      {/* Image Modal */}
      <Modal visible={imageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
          <View style={styles.modalContainer}>
              <Pressable style={styles.modalCloseArea} onPress={() => setImageModalVisible(false)} />
              <View style={styles.modalContent}>
                 <Image source={{ uri: receipt.image_url! }} style={styles.fullImage} resizeMode="contain" />
                 <Pressable style={styles.closeButton} onPress={() => setImageModalVisible(false)}>
                     <Text style={styles.closeButtonText}>Close</Text>
                 </Pressable>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
      fontSize: 18,
      fontFamily: 'Manrope_700Bold',
  },
  backButton: {
      padding: 8,
      marginLeft: -8,
  },
  deleteButton: {
      padding: 8,
      marginRight: -8,
  },
  content: {
      padding: 20,
      paddingBottom: 40,
  },
  card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
      marginBottom: 16,
  },
  cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
  },
  iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  headerText: {
      flex: 1,
  },
  merchantName: {
      fontSize: 20,
      fontFamily: 'Manrope_700Bold',
      marginBottom: 4,
  },
  date: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
  },
  divider: {
      height: 1,
      width: '100%',
      marginBottom: 16,
      opacity: 0.5,
  },
  amountSection: {
      alignItems: 'center',
  },
  totalLabel: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      marginBottom: 4,
  },
  totalAmount: {
      fontSize: 32,
      fontFamily: 'Manrope_800ExtraBold',
  },
  grid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
  },
  gridItem: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
  },
  gridIcon: {
      marginBottom: 8,
      opacity: 0.7,
  },
  gridLabel: {
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
      marginBottom: 4,
  },
  gridValue: {
      fontSize: 16,
      fontFamily: 'Manrope_700Bold',
  },
  section: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
  },
  sectionTitle: {
      fontSize: 16,
      fontFamily: 'Manrope_700Bold',
      marginBottom: 12,
  },
  imagePreview: {
      height: 200,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
  },
  image: {
      width: '100%',
      height: '100%',
  },
  imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
  },
  viewImageText: {
      color: '#FFF',
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 14,
  },
  itemsList: {
      gap: 0,
  },
  itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
  },
  itemInfo: {
      flex: 1,
      marginRight: 12,
  },
  itemName: {
      fontSize: 14,
      fontFamily: 'Manrope_600SemiBold',
      marginBottom: 2,
  },
  itemQty: {
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
  },
  itemTotal: {
      fontSize: 14,
      fontFamily: 'Manrope_700Bold',
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
})
