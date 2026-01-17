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
    isLoading: false,
    error: null,
    results: [],
  });
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
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
    setPreviewUrls(assets.map(a => a.uri));
    setAnalysis({ isLoading: true, error: null, results: [] });

    try {
      const getBase64 = async (asset: ImagePicker.ImagePickerAsset) => {
        if (asset.base64) return asset.base64;
        return await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      };

      // Initial analysis
      const initialResults = await Promise.all(assets.map(async (asset) => {
        const base64 = await getBase64(asset);
        if (!base64) throw new Error('Could not read image data');
        const data = await analyzeReceipt(base64);
        return { asset, data };
      }));

      // Identify receipts needing retry
      const resultsWithRetry = await Promise.all(initialResults.map(async ({ asset, data }) => {
        if (data.integrityScore !== undefined && !isIntegrityAcceptable(data.integrityScore)) {
          console.log(`[Retry] Low integrity (${data.integrityScore}) for ${data.merchantName}. Retrying...`);
          try {
            const base64 = await getBase64(asset);
            const retriedData = await analyzeReceipt(base64);
            
            // If retry improved the score, use it; otherwise stay with the best we got
            if ((retriedData.integrityScore || 0) > (data.integrityScore || 0)) {
              console.log(`[Retry] Success! Improved integrity from ${data.integrityScore} to ${retriedData.integrityScore}`);
              return retriedData;
            }
            return data;
          } catch (retryErr) {
            console.error(`[Retry] Failed for ${data.merchantName}:`, retryErr);
            return data;
          }
        }
        return data;
      }));

      setAnalysis({ isLoading: false, error: null, results: resultsWithRetry });
    } catch (err: any) {
      console.error(err);
      setAnalysis({ isLoading: false, error: err.message || "An error occurred during analysis", results: [] });
    }
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
      setAnalysis(prev => {
        const newResults = prev.results.filter(r => r !== data);
        if (newResults.length === 0) {
          // If no more results, reset everything
          setTimeout(resetScanner, 500);
        }
        return { ...prev, results: newResults };
      });

      Alert.alert('Success', `${data.merchantName} receipt saved successfully!`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to save receipt: ' + (err.message || 'Unknown error'));
      throw err;
    }
  };

  const handleSaveAllResults = async () => {
    if (analysis.results.length === 0) return;

    try {
      await createReceipts(analysis.results);
      
      Alert.alert("Success", "All receipts have been saved successfully.");
      resetScanner();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to save all receipts: " + (err.message || "Unknown error"));
    }
  };

  const resetScanner = () => {
    setAnalysis({ isLoading: false, error: null, results: [] });
    setPreviewUrls([]);
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
          {previewUrls.length > 0 && (
            <TouchableOpacity onPress={resetScanner} style={styles.newScanButton}>
              <RefreshCw size={14} color="#4f46e5" />
              <Text style={styles.newScanText}>Scan New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {previewUrls.length === 0 ? (
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
            {/* Image Preview List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewList}>
              {previewUrls.map((url, idx) => (
                <View key={idx} style={[styles.imagePreviewContainer, { backgroundColor: colors.card, borderColor: colors.border, marginRight: previewUrls.length > 1 ? 12 : 0, width: previewUrls.length > 1 ? 280 : '100%' }]}>
                  <Image 
                    source={{ uri: url }} 
                    style={[styles.previewImage, { backgroundColor: colors.background }]}
                    contentFit="contain"
                  />
                  {analysis.isLoading && (
                    <View style={styles.loadingOverlay}>
                      <Text style={styles.analyzingText}>Analyzing...</Text>
                    </View>
                  )}
                  <View style={styles.previewFooter}>
                    <Text style={styles.previewFooterText}>RECEIPT {idx + 1}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Results */}
            <ReceiptAnalyzer 
              isLoading={analysis.isLoading} 
              error={analysis.error} 
              results={analysis.results}
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

