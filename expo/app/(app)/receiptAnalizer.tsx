import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Upload, RefreshCw } from 'lucide-react-native';

import { ReceiptAnalyzer } from '@/components/receiptAnalizer/ReceiptAnalyzer';
import { ReceiptData } from '@/components/receiptAnalizer/types';
import { createReceipts } from '@/services/receipts';
import { useScannerStore } from '@/store/useScannerStore';
import { useReceiptsStore } from '@/store/useReceiptsStore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

const App: React.FC = () => {
  const { t } = useTranslation();
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Scanner Store (Transient logic)
  const scannerItems = useScannerStore((state) => state.items);
  // const isScanning = useScannerStore((state) => state.isScanning);
  const processImages = useScannerStore((state) => state.processImages);
  const resetScanner = useScannerStore((state) => state.resetScanner);
  
  // Receipts Store (Persistence)
  const addNewReceipt = useReceiptsStore((state) => state.actions.addReceipt);
  const fetchReceipts = useReceiptsStore((state) => state.actions.fetchReceipts);

  // We can derive the analysis state expected by the UI from the store state
  // const [analysis, setAnalysis] = useState<AnalysisState>({
  //   items: scannerItems
  // });

  const pickImage = async () => {
    try {
      // Request permission
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('scanner.permissionDenied'), t('scanner.permissionMessage'));
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10, 
        allowsEditing: false, 
        quality: 0.8, // Initial quality, but we will compress further
        base64: false, // We will get base64 from manipulator
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Optimize images before processing
        const processedAssets = await Promise.all(result.assets.map(async (asset) => {
            try {
                const manipResult = await manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 1080 } }], // Max width 1080px (maintains aspect ratio)
                    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
                );
                
                return {
                    ...asset,
                    uri: manipResult.uri,
                    width: manipResult.width,
                    height: manipResult.height,
                    base64: manipResult.base64
                };
            } catch (e) {
                console.error("Image manipulation failed for", asset.uri, e);
                return asset; // Fallback to original if optimization fails
            }
        }));

        processImages(processedAssets);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', t('scanner.pickImageError'));
    }
  };

  // Local processImages removed, using store action instead

  const handleSaveReceipt = async (data: ReceiptData) => {
    try {
      await addNewReceipt({
        merchant_name: data.merchantName,
        total: data.total,
        currency: data.currency,
        date: data.date,
        category: data.category || 'Other',
        tax_amount: data.taxAmount || 0,
        image_url: data.imageUri,
        raw_ai_output: data,
        items: data.items.map(item => {
          const quantity = item.quantity || 1;
          const unitPrice = item.unitPrice || (item.totalPrice / quantity);
          return {
            name: item.name,
            totalPrice: item.totalPrice,
            unitPrice: unitPrice,
            quantity: quantity,
          };
        }),
      });

      Alert.alert('Success', `${data.merchantName} ${t('scanner.saveSuccess')}`);

      // Since transient state is now in store, we might want to remove this specific item?
      // For now, no action needed on scanner store as per user preference to keep it manually controllable.
      
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', t('scanner.saveError') + ': ' + (err.message || 'Unknown error'));
    }
  };

  const handleSaveAllResults = async () => {
    const completedItems = scannerItems.filter(i => i.status === 'completed' && i.data);
    if (completedItems.length === 0) return;

    try {
      const resultsToSave = completedItems.map(i => ({ ...i.data!, imageUri: i.uri }));
      await createReceipts(resultsToSave);
      
      // Refresh global list
      await fetchReceipts();

      Alert.alert("Success", t('scanner.saveAllSuccess'));
      resetScanner();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to save all receipts: " + (err.message || "Unknown error"));
    }
  };

  const handleRetry = () => {
      // Logic for retry would need to be in store or re-implemented
      // For now, placeholder
       Alert.alert("Retry", "Retry logic moved to store (not fully implemented in UI yet)");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={activeTheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('scanner.scanYourReceipt')}</Text>
        {(scannerItems.length > 0) && (
          <TouchableOpacity 
            onPress={resetScanner} 
            style={[styles.newScanButton, { backgroundColor: colors.tint + '20' }]}
          >
            <RefreshCw size={14} color={colors.tint} />
            <Text style={[styles.newScanText, { color: colors.tint }]}>{t('scanner.scanNew')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {scannerItems.length === 0 ? (
          <View style={styles.landingContainer}>
            <View style={styles.heroTextContainer}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{t('scanner.heroTitle')}</Text>
              <Text style={[styles.heroSubtitle, { color: colors.icon }]}>
                {t('scanner.heroSubtitle')}
              </Text>
            </View>
            
            <TouchableOpacity onPress={pickImage} style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.uploadIconCircle, { backgroundColor: colors.tint + '20' }]}>
                <Upload color={colors.tint} size={40} />
              </View>
              <Text style={[styles.uploadTitle, { color: colors.text }]}>{t('scanner.uploadTitle')}</Text>
              <Text style={[styles.uploadSubtitle, { color: colors.icon }]}>{t('scanner.uploadSubtitle')}</Text>
            </TouchableOpacity>


          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <ReceiptAnalyzer 
              items={scannerItems}
              onSave={handleSaveReceipt}
              onSaveAll={handleSaveAllResults}
              onRetry={handleRetry}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  
  // Header - matching receipts page design
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
  newScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newScanText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },

  // Landing
  landingContainer: {
    padding: 24,
    alignItems: 'center',
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    minHeight: '60%',
    justifyContent: 'center',
  },
  heroTextContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800', // extra-bold
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
  },
  uploadCard: {
    width: '100%',
    maxWidth: 400,
    height: 256,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    // Add simple hover/press effect via opacity usually, or just static style
  },
  uploadIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
  },

  // Features
  featuresGrid: {
    width: '100%',
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  featureIconContainer: {
    marginBottom: 12,
  },
  featureTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },

  // Results
  resultsContainer: {
    padding: 16,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    gap: 32,
    flexDirection: 'column', // Stack on mobile
  },
  imagePreviewContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  analyzingText: {
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 12,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  previewFooterText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewList: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 12,
  },
});

export default App;



