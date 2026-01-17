import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { Camera, Upload, RefreshCw, ShoppingBag, Percent, Banknote, ScanLine } from 'lucide-react-native';

import { ReceiptAnalyzer } from '@/components/receiptAnalizer/ReceiptAnalyzer';
import { ReceiptData, AnalysisState } from '@/components/receiptAnalizer/types';
import { analyzeReceipt } from '@/services/processReceipt';
import { createReceipt, createReceipts } from '@/services/receipts';
import { isIntegrityAcceptable } from '@/services/receiptIntegrity';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

const App: React.FC = () => {
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [analysis, setAnalysis] = useState<AnalysisState>({
    items: [],
  });
  // const [previewUrls, setPreviewUrls] = useState<string[]>([]); // Removed
  const [lastAssets, setLastAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const pickImage = async () => {
    try {
      // Request permission
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10, 
        allowsEditing: false, 
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLastAssets(result.assets);
        processImages(result.assets);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const processImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    // Initialize items with processing status
    const newItems = assets.map(asset => ({
      id: Math.random().toString(36).substring(7),
      uri: asset.uri,
      status: 'processing' as const,
    }));

    setAnalysis({ items: newItems });

    // Process each image concurrently
    assets.forEach(async (asset, index) => {
      const itemId = newItems[index].id;

      try {
        let base64 = asset.base64;
        if (!base64) {
          base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        }
        
        if (!base64) throw new Error('Could not read image data');
        
        // Initial analysis
        let data = await analyzeReceipt(base64);

        // Check integrity and retry if needed
        if (data.integrityScore !== undefined && !isIntegrityAcceptable(data.integrityScore)) {
          console.log(`[Retry] Low integrity (${data.integrityScore}) for ${data.merchantName}. Retrying...`);
          try {
             // For retry, we need to read base64 again just to be safe or reuse? 
             // reusing local variable base64 is fine.
             const retriedData = await analyzeReceipt(base64);
             
             if ((retriedData.integrityScore || 0) > (data.integrityScore || 0)) {
               console.log(`[Retry] Success! Improved integrity from ${data.integrityScore} to ${retriedData.integrityScore}`);
               data = retriedData;
             }
          } catch (retryErr) {
             console.error(`[Retry] Failed for ${data.merchantName}:`, retryErr);
          }
        }

        // Update item to completed
        setAnalysis(prev => ({
          ...prev,
          items: prev.items.map(item => 
            item.id === itemId 
              ? { ...item, status: 'completed', data } 
              : item
          )
        }));

      } catch (err: any) {
        console.error(`Failed to process item ${itemId}:`, err);
        // Update item to error
        setAnalysis(prev => ({
          ...prev,
          items: prev.items.map(item => 
            item.id === itemId 
              ? { ...item, status: 'error', error: err.message || 'Analysis failed' } 
              : item
          )
        }));
      }
    });
  };

  const handleSaveReceipt = async (data: ReceiptData) => {
    try {
      await createReceipt({
        merchant_name: data.merchantName,
        total: data.total,
        currency: data.currency,
        date: data.date,
        category: data.category || 'Other',
        tax_amount: data.taxAmount || 0,
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

      // Remove the specifically saved item from the list
      // Update the specific item to remove it (or mark saved?)
      // User requested "stop showing the images at the top", so we might just keep the completed accordion.
      // But typically "save" implies it's handled. 
      // The original code filtered it out. Let's keep filtering it out for now so the list shrinks.
      setAnalysis(prev => {
        const newItems = prev.items.filter(item => item.data !== data);
        if (newItems.length === 0) {
          setTimeout(resetScanner, 500);
        }
        return { ...prev, items: newItems };
      });

      Alert.alert('Success', `${data.merchantName} receipt saved successfully!`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to save receipt: ' + (err.message || 'Unknown error'));
      throw err;
    }
  };

  const handleSaveAllResults = async () => {
    const completedItems = analysis.items.filter(i => i.status === 'completed' && i.data);
    if (completedItems.length === 0) return;

    try {
      const resultsToSave = completedItems.map(i => i.data!);
      await createReceipts(resultsToSave);
      
      Alert.alert("Success", "All receipts have been saved successfully.");
      resetScanner();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to save all receipts: " + (err.message || "Unknown error"));
    }
  };

  const resetScanner = () => {
    setAnalysis({ items: [] });
    setLastAssets([]);
  };

  const handleRetry = () => {
    if (lastAssets.length > 0) {
      processImages(lastAssets);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={activeTheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <ScanLine color="#ffffff" size={20} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>ReceiptScan AI</Text>
          </View>
          {(analysis.items.length > 0) && (
            <TouchableOpacity onPress={resetScanner} style={styles.newScanButton}>
              <RefreshCw size={14} color="#4f46e5" />
              <Text style={styles.newScanText}>Scan New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {analysis.items.length === 0 ? (
          <View style={styles.landingContainer}>
            <View style={styles.heroTextContainer}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Digitize your receipts in seconds</Text>
              <Text style={[styles.heroSubtitle, { color: colors.icon }]}>
                Our advanced AI extracts items, prices, and taxes with high precision. Just upload images to get started.
              </Text>
            </View>
            
            <TouchableOpacity onPress={pickImage} style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.uploadIconCircle}>
                <Upload color="#4f46e5" size={40} />
              </View>
              <Text style={[styles.uploadTitle, { color: colors.text }]}>Upload Receipts</Text>
              <Text style={styles.uploadSubtitle}>Tap to select from Gallery</Text>
            </TouchableOpacity>

            <View style={styles.featuresGrid}>
              <FeatureCard 
                icon={<ShoppingBag color={colors.text} size={24} />}
                title="Bulk Processing" 
                desc="Upload multiple receipts at once and process them in parallel."
                colors={colors}
              />
              <FeatureCard 
                icon={<Percent color={colors.text} size={24} />}
                title="Tax & VAT Detection" 
                desc="Automatically calculates tax components for each receipt."
                colors={colors}
              />
              <FeatureCard 
                icon={<Banknote color={colors.text} size={24} />}
                title="History Tracking" 
                desc="Save records directly to your account for easy tracking."
                colors={colors}
              />
            </View>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <ReceiptAnalyzer 
              items={analysis.items}
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

// Helper component for features
const FeatureCard = ({ icon, title, desc, colors }: { icon: React.ReactNode, title: string, desc: string, colors: any }) => (
  <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={styles.featureIconContainer}>{icon}</View>
    <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.featureDesc, { color: colors.icon }]}>{desc}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  
  // Header
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    // Shadow for iOS/Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 900, // Max width constraint
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  newScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newScanText: {
    color: '#4f46e5',
    fontWeight: '600',
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
    backgroundColor: '#e0e7ff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
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

