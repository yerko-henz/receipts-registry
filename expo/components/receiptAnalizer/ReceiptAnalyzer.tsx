import React from 'react';
import { View, Text, StyleSheet, LayoutAnimation, Platform, UIManager, TouchableOpacity, Alert, Image } from 'react-native';
import { AnalysisState, ReceiptData, ProcessedReceipt } from './types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';
import { Save, Download, Loader2 } from 'lucide-react-native';
import { isIntegrityAcceptable } from '@/services/receiptIntegrity';

// Extracted Components
import { AnalysisError } from './components/AnalysisError';
import { AnalysisLoading } from './components/AnalysisLoading';
import { MerchantHeader } from './components/MerchantHeader';
import { ItemsTable } from './components/ItemsTable';
import { SummarySection } from './components/SummarySection';
import { ActionButtons } from './components/ActionButtons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Sub-component for individual receipt result to manage its own expanded state
const ResultItem: React.FC<{ 
  data: ReceiptData; 
  onSave?: (data: ReceiptData) => Promise<void>; 
  themeColors: any;
  activeTheme: 'light' | 'dark';
  initiallyExpanded?: boolean;
}> = ({ data, onSave, themeColors, activeTheme, initiallyExpanded = false }) => {
  const [isExpanded, setIsExpanded] = React.useState(initiallyExpanded);
  const [isSaving, setIsSaving] = React.useState(false);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const handleSave = async () => {
    if (onSave && data && !isSaving) {
      setIsSaving(true);
      try {
        await onSave(data);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <View style={[
      styles.resultContainer, 
      { backgroundColor: themeColors.card, borderColor: themeColors.border }
    ]}>
      <MerchantHeader 
        merchantName={data.merchantName}
        date={data.date}
        isExpanded={isExpanded}
        onToggle={toggleAccordion}
      />

      {isExpanded && (
        <>
          <ItemsTable items={data.items} currency={data.currency} />
          
          <SummarySection 
            taxAmount={data.taxAmount}
            discount={data.discount}
            total={data.total}
            currency={data.currency}
          />

          <ActionButtons 
            onSave={handleSave}
            isSaving={isSaving}
          />
        </>
      )}
    </View>
  );
};

const ProcessingItem: React.FC<{
  item: ProcessedReceipt;
  themeColors: any;
  activeTheme: 'light' | 'dark';
}> = ({ item, themeColors, activeTheme }) => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) return prev + Math.random() * 10;
        return prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[
      styles.resultContainer,
      { backgroundColor: themeColors.card, borderColor: themeColors.border, padding: 16 }
    ]}>
      <View style={styles.merchantRow}>
        <View style={{ gap: 4 }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
             <Image source={{ uri: item.uri }} style={{ width: 40, height: 40, borderRadius: 4 }} />
             <View>
               <Text style={[styles.merchantName, { color: themeColors.text, fontSize: 16 }]}>
                 {item.status === 'error' ? 'Analysis Failed' : 'Analyzing Receipt...'}
               </Text>
               <Text style={[styles.dateText, { color: themeColors.icon }]}>
                 {item.status === 'error' ? 'Please try again' : `ID: ${item.id}`}
               </Text>
             </View>
           </View>
        </View>
        
        {item.status === 'error' ? (
             <View style={[styles.verifiedBadge, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.verifiedText, { color: '#ef4444' }]}>Error</Text>
            </View>
        ) : null}
      </View>

      {item.status === 'processing' && (
        <View style={{ marginTop: 12, height: 4, backgroundColor: themeColors.border, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ width: `${progress}%`, height: '100%', backgroundColor: themeColors.tint }} />
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

export const ReceiptAnalyzer: React.FC<AnalysisState> = ({ items, onSave, onSaveAll, onRetry }) => {
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  
  const [isSavingAll, setIsSavingAll] = React.useState(false);

  const completedCount = items.filter(i => i.status === 'completed').length;
  const processingCount = items.filter(i => i.status === 'processing').length;

  const handleSaveAll = async () => {
    const completedItems = items.filter(i => i.status === 'completed' && i.data);
    
    if (completedItems.length > 0 && !isSavingAll) {
      setIsSavingAll(true);
      try {
        if (onSaveAll) {
          await onSaveAll();
        } else if (onSave) {
          for (const item of completedItems) {
            if (item.data) await onSave(item.data);
          }
        }
      } finally {
        setIsSavingAll(false);
      }
    }
  };

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.resultsHeader}>
        <View style={styles.headerTitleRow}>
            <Text style={[styles.resultsTitle, { color: themeColors.text }]}>
            {completedCount} / {items.length} Completed
            </Text>
        </View>

        {completedCount > 1 && (
            <View style={styles.batchActions}>
                <TouchableOpacity style={[styles.batchButtonSecondary, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <Download size={16} color={themeColors.tint} />
                    <Text style={[styles.batchButtonTextSecondary, { color: themeColors.tint }]}>Export All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.batchButtonPrimary, isSavingAll && styles.batchButtonDisabled, { backgroundColor: themeColors.tint }]} 
                    onPress={handleSaveAll}
                    disabled={isSavingAll}
                >
                    {isSavingAll ? (
                        <Loader2 size={16} color="#ffffff" style={{ marginRight: 4 }} />
                    ) : (
                        <Save size={16} color="#ffffff" style={{ marginRight: 4 }} />
                    )}
                    <Text style={styles.batchButtonTextPrimary}>Save All</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>

      <View style={styles.resultsList}>
        {items.map((item) => (
          item.status === 'completed' && item.data ? (
            <ResultItem 
              key={item.id} 
              data={item.data} 
              onSave={onSave} 
              themeColors={themeColors}
              activeTheme={activeTheme as 'light' | 'dark'}
              initiallyExpanded={completedCount === 1}
            />
          ) : (
            <ProcessingItem
              key={item.id}
              item={item}
              themeColors={themeColors}
              activeTheme={activeTheme as 'light' | 'dark'}
            />
          )
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
