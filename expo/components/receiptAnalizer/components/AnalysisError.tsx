import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

interface AnalysisErrorProps {
  error: string;
  retryCountdown: number;
  onRetry?: () => void;
}

export const AnalysisError: React.FC<AnalysisErrorProps> = ({ error, retryCountdown, onRetry }) => {
  const { t } = useTranslation();
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const dynamicStyles = StyleSheet.create({
    errorContainer: {
        backgroundColor: activeTheme === 'dark' ? '#2d1a1a' : '#fef2f2',
        borderColor: activeTheme === 'dark' ? '#b91c1c' : '#fee2e2',
    },
    errorTitle: {
        color: activeTheme === 'dark' ? '#fca5a5' : '#b91c1c',
    },
    errorMessage: {
        color: activeTheme === 'dark' ? '#fca5a5' : '#b91c1c',
    },
  });

  return (
    <View style={[styles.errorContainer, dynamicStyles.errorContainer]}>
    <View style={styles.errorHeader}>
        <AlertCircle size={24} color={activeTheme === 'dark' ? '#fca5a5' : '#b91c1c'} />
        <Text style={[styles.errorTitle, dynamicStyles.errorTitle]}>{t('scanner.analysisFailed')}</Text>
      </View>
      <Text style={[styles.errorMessage, dynamicStyles.errorMessage]}>{error}</Text>
      
      {onRetry && (
        <TouchableOpacity 
          style={[
            styles.retryButton, 
            retryCountdown > 0 && styles.retryButtonDisabled,
            { backgroundColor: activeTheme === 'dark' ? '#333' : '#fff' }
          ]}
          onPress={onRetry}
          disabled={retryCountdown > 0}
        >
          <RefreshCw size={16} color={retryCountdown > 0 ? themeColors.icon : themeColors.tint} />
          <Text style={[
            styles.retryButtonText, 
            { color: retryCountdown > 0 ? themeColors.icon : themeColors.tint }
          ]}>
            {retryCountdown > 0 ? t('scanner.retryIn', { count: retryCountdown }) : t('scanner.tryAgain')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    borderWidth: 1,
    padding: 24,
    borderRadius: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorMessage: {
    fontSize: 14,
    opacity: 0.9,
  },
  retryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
