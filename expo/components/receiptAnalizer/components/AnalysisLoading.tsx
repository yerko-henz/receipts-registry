import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';
import { ProgressBar } from './ProgressBar';

interface AnalysisLoadingProps {
  progress: number;
}

export const AnalysisLoading: React.FC<AnalysisLoadingProps> = ({ progress }) => {
  const { t } = useTranslation();
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const dynamicStyles = StyleSheet.create({
    loadingContainer: {
        backgroundColor: themeColors.card,
        borderColor: themeColors.border,
    },
    skeletonLine: {
        backgroundColor: activeTheme === 'dark' ? '#333' : '#e2e8f0',
    },
  });

  return (
    <View style={[styles.loadingContainer, dynamicStyles.loadingContainer]}>
      <Text style={[styles.loadingTitle, { color: themeColors.text }]}>{t('scanner.analyzingReceipt')}</Text>
      <Text style={[styles.loadingSubtitle, { color: themeColors.icon }]}>
        {t('scanner.extractingDetails')}
      </Text>
      
      <ProgressBar 
        progress={progress} 
        color={themeColors.tint} 
      />
      
      <View style={styles.skeletonGroup}>
        <View style={[styles.skeletonLine, dynamicStyles.skeletonLine, { width: '80%' }]} />
        <View style={[styles.skeletonLine, dynamicStyles.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  skeletonLine: {
    borderRadius: 4,
    height: 12,
    marginBottom: 12,
  },
  skeletonGroup: {
    width: '100%',
    alignItems: 'center',
  },
});
