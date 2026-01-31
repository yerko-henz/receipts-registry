import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FileText, Loader2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProcessedReceipt } from '../types';
import { useTranslation } from 'react-i18next';

interface QueueItemProps {
  item: ProcessedReceipt;
  index: number;
}

export const QueueItem: React.FC<QueueItemProps> = ({ item, index }) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Mock time based on index for visual variance
  const mockTime = new Date();
  mockTime.setMinutes(mockTime.getMinutes() - index);
  const timeString = mockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getStatusColor = () => {
    switch (item.status) {
      case 'processing': return colors.tint;
      case 'completed': return '#22c55e'; // green-500
      case 'error': return '#ef4444'; // red-500
      default: return colors.icon;
    }
  };

  // Simulate "Longer than usual" for index 0 if processing, but only sometimes (e.g. based on seconds)
  // For now, let's disable it or make it conditional to allow seeing "Scanning..."
  const isTakingLong = item.status === 'processing' && index > 99; // Effectively disabled to show Scanning

  const getStatusText = () => {
    switch (item.status) {
      case 'processing': 
        return isTakingLong ? t('scanner.takingLonger') : (t('scanner.analyzingReceipt') || 'Scanning...');
      case 'completed': return t('scanner.completed') || 'Done';
      case 'error': return t('common.error') || 'Error';
      default: return t('scanner.waiting');
    }
  };

  return (
    <View style={styles.container}>
      {/* Icon Box */}
      <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
        <FileText size={24} color="#64748b" />
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.timestamp, { color: colors.icon }]}>{timeString}</Text>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        {item.status === 'processing' && (
             <Loader2 size={14} color={isTakingLong ? '#eab308' : colors.tint} style={{ marginRight: 6 }} />
        )}
        <Text style={[styles.statusText, { color: isTakingLong ? '#eab308' : getStatusColor() }]}>
            {getStatusText()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  timestamp: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
