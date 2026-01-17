import React from 'react';
import { View, Text, StyleSheet, LayoutAnimation, Platform, UIManager, TouchableOpacity } from 'react-native';
import { AnalysisState, ReceiptData } from './types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';
import { Save, Download, Loader2 } from 'lucide-react-native';

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

export const ReceiptAnalyzer: React.FC<AnalysisState> = ({ isLoading, error, results, onSave, onSaveAll, onRetry }) => {
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  
  const [simulatedProgress, setSimulatedProgress] = React.useState(0);
  const [retryCountdown, setRetryCountdown] = React.useState(0);
  const [isSavingAll, setIsSavingAll] = React.useState(false);

  // Simulated progress during loading
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      setSimulatedProgress(0);
      interval = setInterval(() => {
        setSimulatedProgress(prev => {
          if (prev < 30) return prev + 5;
          if (prev < 70) return prev + 2;
          if (prev < 95) return prev + 0.5;
          return prev;
        });
      }, 500);
    } else {
      setSimulatedProgress(100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Retry countdown logic
  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (error) {
      setRetryCountdown(10);
      timer = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRetryCountdown(0);
    }
    return () => clearInterval(timer);
  }, [error]);

  const handleSaveAll = async () => {
    if (results.length > 0 && !isSavingAll) {
      setIsSavingAll(true);
      try {
        if (onSaveAll) {
          await onSaveAll();
        } else if (onSave) {
          // Fallback if onSaveAll is not provided
          for (const result of results) {
            await onSave(result);
          }
        }
      } finally {
        setIsSavingAll(false);
      }
    }
  };

  if (error) {
    return (
      <AnalysisError 
        error={error} 
        retryCountdown={retryCountdown} 
        onRetry={onRetry} 
      />
    );
  }

  if (isLoading) {
    return <AnalysisLoading progress={simulatedProgress} />;
  }

  if (results.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.resultsHeader}>
        <View style={styles.headerTitleRow}>
            <Text style={[styles.resultsTitle, { color: themeColors.text }]}>
            {results.length} Receipt{results.length > 1 ? 's' : ''} Analyzed
            </Text>
        </View>

        {results.length > 1 && (
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
        {results.map((data, index) => (
          <ResultItem 
            key={index} 
            data={data} 
            onSave={onSave} 
            themeColors={themeColors}
            activeTheme={activeTheme as 'light' | 'dark'}
            initiallyExpanded={results.length === 1}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});
