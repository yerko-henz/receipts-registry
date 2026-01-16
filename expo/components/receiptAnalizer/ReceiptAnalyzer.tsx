import React from 'react';
import { View, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { AnalysisState } from './types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

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

export const ReceiptAnalyzer: React.FC<AnalysisState> = ({ isLoading, error, data, onSave, onRetry }) => {
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [retryCountdown, setRetryCountdown] = React.useState(0);
  const [simulatedProgress, setSimulatedProgress] = React.useState(0);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

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

  if (!data) return null;

  return (
    <View style={[
      styles.container, 
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

const styles = StyleSheet.create({
  container: {
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
