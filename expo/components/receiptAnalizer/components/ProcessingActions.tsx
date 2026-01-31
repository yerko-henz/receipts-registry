import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';

interface ProcessingActionsProps {
  onCancel?: () => void;
}

export const ProcessingActions: React.FC<ProcessingActionsProps> = ({ onCancel }) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  /* Unused state removed */
  
  return (
    <View style={styles.container}>
      {/* Cancel Button */}
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={onCancel}
      >
        <Text style={styles.cancelText}>{t('scanner.cancelProcessing')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 0,
    alignItems: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
});
