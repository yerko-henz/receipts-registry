import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { Camera, Upload, RefreshCw, ShoppingBag, Percent, Banknote, ScanLine } from 'lucide-react-native';

import { ReceiptAnalyzer } from './receiptAnalizer';
import { ReceiptData, AnalysisState } from './types';
import { analyzeReceipt } from '@/services/processReceipt';

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
    data: null,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
        allowsEditing: true, // Optional: allow cropping
        quality: 0.8,
        base64: true, // Request base64 directly
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        processImage(result.assets[0]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const uri = asset.uri;
    setPreviewUrl(uri);
    setAnalysis({ isLoading: true, error: null, data: null });

    try {
      let base64 = asset.base64;
      
      // If base64 is missing (sometimes happens on Android depending on version/options), read it manually
      if (!base64) {
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      }

      if (!base64) {
        throw new Error('Could not read image data');
      }

      // Add prefix if missing (GenAI usually handles raw base64, but data URI scheme helps sometimes)
      // The service expects just base64 or creating inlineData. 
      // Checking service/processReceipt.ts:
      // It does `base64Image.split(',')[1] || base64Image`
      // So assuming we pass the raw base64 or data url is fine.
      
      const result = await analyzeReceipt(base64);
      setAnalysis({ isLoading: false, error: null, data: result });
    } catch (err: any) {
      console.error(err);
      setAnalysis({ isLoading: false, error: err.message || "An error occurred during analysis", data: null });
    }
  };

  const resetScanner = () => {
    setAnalysis({ isLoading: false, error: null, data: null });
    setPreviewUrl(null);
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
          {previewUrl && (
            <TouchableOpacity onPress={resetScanner} style={styles.newScanButton}>
              <RefreshCw size={14} color="#4f46e5" />
              <Text style={styles.newScanText}>Scan New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!previewUrl ? (
          <View style={styles.landingContainer}>
            <View style={styles.heroTextContainer}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Digitize your receipts in seconds</Text>
              <Text style={[styles.heroSubtitle, { color: colors.icon }]}>
                Our advanced AI extracts items, prices, and taxes with high precision. Just upload an image to get started.
              </Text>
            </View>
            
            <TouchableOpacity onPress={pickImage} style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.uploadIconCircle}>
                <Upload color="#4f46e5" size={40} />
              </View>
              <Text style={[styles.uploadTitle, { color: colors.text }]}>Upload Receipt</Text>
              <Text style={styles.uploadSubtitle}>Tap to select from Gallery</Text>
            </TouchableOpacity>

            <View style={styles.featuresGrid}>
              <FeatureCard 
                icon={<ShoppingBag color={colors.text} size={24} />}
                title="Itemized Extraction" 
                desc="Every product listed with individual pricing."
                colors={colors}
              />
              <FeatureCard 
                icon={<Percent color={colors.text} size={24} />}
                title="Tax & VAT Detection" 
                desc="Automatically calculates tax components."
                colors={colors}
              />
              <FeatureCard 
                icon={<Banknote color={colors.text} size={24} />}
                title="Currency Support" 
                desc="Handles multiple global currencies."
                colors={colors}
              />
            </View>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {/* Image Preview */}
            <View style={[styles.imagePreviewContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image 
                source={{ uri: previewUrl }} 
                style={[styles.previewImage, { backgroundColor: colors.background }]}
                contentFit="contain" // 'contain' for expo-image, similar to object-contain
              />
              {analysis.isLoading && (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.analyzingText}>Analyzing receipt details...</Text>
                </View>
              )}
              <View style={styles.previewFooter}>
                <Text style={styles.previewFooterText}>RECEIPT CAPTURE</Text>
                <Text style={styles.previewFooterText}>ORIGINAL FILE</Text>
              </View>
            </View>

            {/* Results */}
            <ReceiptAnalyzer 
              isLoading={analysis.isLoading} 
              error={analysis.error} 
              data={analysis.data} 
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
});

export default App;

