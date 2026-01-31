import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProcessedReceipt } from '../types';
import { QueueItem } from './QueueItem';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface QueueListProps {
  items: ProcessedReceipt[];
}

export const QueueList: React.FC<QueueListProps> = ({ items }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: colors.icon }]}>QUEUE</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
            <QueueItem key={item.id} item={item} index={index} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  header: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    flexDirection: 'column',
  },
});
