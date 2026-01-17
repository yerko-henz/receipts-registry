import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Download, Save, Loader2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

interface ActionButtonsProps {
  onSave?: () => void;
  isSaving: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onSave, isSaving }) => {
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const dynamicStyles = StyleSheet.create({
    actionButtonTextSecondary: {
        color: themeColors.text,
    },
    actionButtonSecondary: {
        backgroundColor: activeTheme === 'dark' ? '#333' : '#f1f5f9',
    },
    actionsContainer: {
        backgroundColor: themeColors.card,
    }
  });

  return (
    <View style={styles.actionsWrapper}>
      <View style={[styles.actionsContainer, dynamicStyles.actionsContainer]}>
        <TouchableOpacity style={[styles.actionButtonSecondary, dynamicStyles.actionButtonSecondary]}>
          <Download size={20} color={themeColors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.actionButtonTextSecondary, dynamicStyles.actionButtonTextSecondary]}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButtonPrimary, isSaving && styles.actionButtonDisabled]}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 size={20} color="#ffffff" style={{ marginRight: 8 }} />
          ) : (
            <Save size={20} color="#ffffff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.actionButtonTextPrimary}>
            {isSaving ? 'Saving...' : 'Save Record'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  actionsWrapper: {
    gap: 8,
  },
  actionsContainer: {
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonSecondary: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonTextSecondary: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#94a3b8',
  },
  integrityWarning: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 16,
    fontWeight: '600',
  },
});
