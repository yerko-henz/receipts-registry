import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet, LayoutAnimation, Platform, UIManager, TouchableOpacity, Image } from 'react-native';
import { AnalysisState, ReceiptData, ProcessedReceipt } from './types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';
import { Save, Download, Loader2 } from 'lucide-react-native';

import { ActionButtons } from './components/ActionButtons';
import { ProcessingHeader } from './components/ProcessingHeader';
import { QueueList } from './components/QueueList';
import { ProcessingActions } from './components/ProcessingActions';
import { useRouter } from 'expo-router';
import { Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { X, Check } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { getCategoryIcon } from '@/constants/categories';
import { format } from 'date-fns';

// Sub-component for individual receipt result (Redesigned)
const ResultItem: React.FC<{ 
  data: ReceiptData; 
  onSave?: (data: ReceiptData) => Promise<void>; 
  themeColors: typeof Colors.light;
  activeTheme: 'light' | 'dark';
  isSaved?: boolean;
}> = ({ data, onSave, themeColors, activeTheme, isSaved }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);
  const [showImage, setShowImage] = React.useState(false);

  const handleReview = async () => {
    // If already saved, just navigate
    if (isSaved) {
        router.push('/receipts');
        return;
    }

    // Save first if onSave is provided
    if (onSave && data && !isSaving) {
      setIsSaving(true);
      try {
        await onSave(data);
        // Navigate after saving
        router.push('/receipts');
      } catch (e) {
          // If save fails, stay here
          console.error("Failed to save on review", e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const Icon = getCategoryIcon(data.category || 'Other');
  
  // Format date safely
  let dateStr = 'Unknown Date';
  try {
      if (data.date) {
        dateStr = format(new Date(data.date), 'MMM dd • h:mm a');
      }
  } catch (e) {
      dateStr = data.date || 'Unknown Date';
  }

  return (
    <>
        <View style={[
        styles.resultContainer, 
        { 
            backgroundColor: themeColors.card, 
            borderColor: themeColors.border, 
            borderWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
        }
        ]}>
        {/* Left Side: Icon + details */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, overflow: 'hidden' }}>
            {/* Icon Box */}
            <TouchableOpacity 
                onPress={() => setShowImage(true)}
                style={{
                    height: 48, 
                    width: 48, 
                    borderRadius: 8, 
                    backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Icon size={24} color={themeColors.text} />
            </TouchableOpacity>
            
            {/* Text Details */}
            <View style={{ flexDirection: 'column', flex: 1 }}>
                <Text style={[styles.merchantName, { color: themeColors.text }]} numberOfLines={1}>
                    {data.merchantName || t('scanner.unknownMerchant')}
                </Text>
                <Text style={{ fontSize: 12, color: themeColors.icon }} numberOfLines={1}>
                    {dateStr}
                </Text>
            </View>
        </View>

        {/* Right Side: Price + Review */}
        <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingLeft: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: themeColors.text }}>
                {data.currency || '$'}{data.total?.toFixed(2)}
            </Text>
            <TouchableOpacity onPress={handleReview} disabled={isSaving}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#10b981' }}>
                    {isSaving ? t('scanner.saving') : t('scanner.review')}
                </Text>
            </TouchableOpacity>
        </View>
        </View>

        {/* Image Modal */}
        <Modal
            visible={showImage}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowImage(false)}
        >
            <View style={{ 
                flex: 1, 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: 20
            }}>
                <TouchableOpacity 
                    style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }}
                    onPress={() => setShowImage(false)}
                >
                    <X color="white" size={30} />
                </TouchableOpacity>

                <Image 
                    source={{ uri: data.imageUri }} 
                    style={{ width: '100%', height: '80%', borderRadius: 8 }} 
                    resizeMode="contain"
                />
            </View>
        </Modal>
    </>
  );
};

const ProcessingItem: React.FC<{
  item: ProcessedReceipt;
  themeColors: typeof Colors.light;
  activeTheme: 'light' | 'dark';
}> = ({ item, themeColors, activeTheme }) => {
  const { t } = useTranslation();

  return (
    <View style={[
      styles.resultContainer,
      { backgroundColor: themeColors.card, borderColor: themeColors.border, padding: 16 }
    ]}>
      <View style={styles.merchantRow}>
        <View style={{ gap: 4 }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
             {/* Using a placeholder or the uri if available, sticking to the existing ProcessingItem design for now as user only asked to change "each card" implying the Results */}
             <Image source={{ uri: item.uri }} style={{ width: 40, height: 40, borderRadius: 4 }} />
             <View>
               <Text style={[styles.merchantName, { color: themeColors.text, fontSize: 16 }]}>
                 {item.status === 'error' ? t('scanner.analysisFailed') : t('scanner.analyzingReceipt')}
               </Text>
               <Text style={[styles.dateText, { color: themeColors.icon }]}>
                 {item.status === 'error' ? t('scanner.pleaseTryAgain') : `${t('receipts.id')}: ${item.id}`}
               </Text>
             </View>
           </View>
        </View>
        
        {item.status === 'error' ? (
             <View style={[styles.verifiedBadge, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.verifiedText, { color: '#ef4444' }]}>{t('common.error') || 'Error'}</Text>
            </View>
        ) : null}
      </View>

      {item.status === 'processing' && (
        <View style={{ marginTop: 12, height: 4, backgroundColor: themeColors.border, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ width: '50%', height: '100%', backgroundColor: themeColors.tint }} /> 
        </View>
      )}

      {item.error && (
        <Text style={{ marginTop: 8, color: '#ef4444', fontSize: 14 }}>
          {item.error}
        </Text>
      )}
    </View>
  );
};

export const ReceiptAnalyzer: React.FC<AnalysisState & { isSaved?: boolean }> = ({ items, onSave, onSaveAll, onRetry, isSaved }) => {
  const { t } = useTranslation();
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  
  const [isSavingAll, setIsSavingAll] = React.useState(false);

  const completedCount = items.filter(i => i.status === 'completed').length;

  const handleSaveAll = async () => {
    const completedItems = items.filter(i => i.status === 'completed' && i.data);
    
    if (completedItems.length > 0 && !isSavingAll) {
      setIsSavingAll(true);
      try {
        if (onSaveAll) {
          await onSaveAll();
        } else if (onSave) {
          for (const item of completedItems) {
            if (item.data) await onSave({ ...item.data, imageUri: item.uri });
          }
        }
      } finally {
        setIsSavingAll(false);
      }
    }
  };

  // Calculate summary stats
  const totalValue = items.reduce((sum, item) => sum + (item.data?.total || 0), 0);
  
  // Find top category
  const categories: Record<string, number> = {};
  items.forEach(item => {
    const cat = item.data?.category || 'Other';
    categories[cat] = (categories[cat] || 0) + (item.data?.total || 0);
  });
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0] || ['Other', 0];
  const TopCatIcon = getCategoryIcon(topCategory[0]);

  if (items.length === 0) return null;

  // Determine if we are still processing
  const isProcessing = completedCount < items.length;

  if (isProcessing) {
    return (
        <View style={styles.container}>
            <ProcessingHeader 
                total={items.length} 
                completed={completedCount} 
            />
            <ProcessingActions onCancel={() => console.log('Cancel pressed')} />
            <QueueList items={items} />
        </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Success Header */}
      <View style={{ alignItems: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
        <View style={{ 
          width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4', // bg-green-50
          justifyContent: 'center', alignItems: 'center', marginBottom: 16,
          shadowColor: '#16a34a', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
        }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' }}>
                <Check color="white" size={28} strokeWidth={3} />
            </View>
        </View>
        
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: themeColors.text, textAlign: 'center', marginBottom: 8 }}>
            {t('scanner.receiptsProcessedSuccess', { count: items.length })}
        </Text>
        <Text style={{ fontSize: 16, color: themeColors.icon, textAlign: 'center' }}>
            {t('scanner.addedToLedger')}
        </Text>
      </View>

      {/* Stats Card */}
      <View style={{ 
          flexDirection: 'row', 
          backgroundColor: themeColors.card, 
          borderRadius: 20, 
          padding: 24, 
          marginBottom: 32,
          borderWidth: 1,
          borderColor: themeColors.border,
          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }
      }}>
          <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: themeColors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: themeColors.icon, letterSpacing: 1, marginBottom: 8 }}>{t('scanner.totalValue')}</Text>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#22c55e' }}>
                  ${totalValue.toFixed(2)}
              </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: themeColors.icon, letterSpacing: 1, marginBottom: 8 }}>{t('scanner.topCategory')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <TopCatIcon size={20} color={themeColors.text} />
                 <Text style={{ fontSize: 18, fontWeight: 'bold', color: themeColors.text }}>
                   {t(`receipts.filters.${topCategory[0]}`, { defaultValue: topCategory[0] })}
                 </Text>
              </View>
          </View>
      </View>

      <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text, marginBottom: 16 }}>
          Receipts
      </Text>

      <View style={styles.resultsList}>
        {items.map((item) => (
            <ResultItem 
              key={item.id} 
              data={item.data ? { ...item.data, imageUri: item.uri } : {
                  merchantName: 'Unknown',
                  date: new Date().toISOString(),
                  items: [],
                  total: 0,
                  currency: 'USD',
                  category: 'Other',
                  imageUri: item.uri
              }}
              onSave={onSave} 
              themeColors={themeColors}
              activeTheme={activeTheme as 'light' | 'dark'}
              isSaved={isSaved}
            />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  resultsHeader: {
    paddingHorizontal: 4,
    marginBottom: 0,
    gap: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.9,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  batchButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  batchButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  batchButtonTextPrimary: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  batchButtonTextSecondary: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  batchButtonDisabled: {
    opacity: 0.7,
  },
  resultsList: {
    gap: 16,
  },
  resultContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  merchantName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#166534',
  },
});
