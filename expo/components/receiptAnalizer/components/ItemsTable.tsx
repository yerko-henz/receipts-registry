import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReceiptItem } from '../types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';
import { formatPrice } from '@/lib/currency';

interface ItemsTableProps {
  items: ReceiptItem[];
  currency: string;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({ items, currency }) => {
  const { t } = useTranslation();
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const formatCurrency = (val: number) => {
    return formatPrice(val, currency);
  };

  const dynamicStyles = StyleSheet.create({
    tableHeader: {
        borderBottomColor: themeColors.border,
        backgroundColor: themeColors.card,
    },
    itemName: {
      color: themeColors.text,
    },
    tableRow: {
        borderBottomColor: activeTheme === 'dark' ? '#333' : '#f8fafc',
    },
    colLabel: {
        color: themeColors.icon,
    },
    colText: {
        color: themeColors.text,
    },
    itemUnitPrice: {
        color: themeColors.icon,
    },
  });

  return (
    <View style={styles.tableContainer}>
      <View style={[styles.tableHeader, dynamicStyles.tableHeader]}>
        <Text style={[styles.colQty, dynamicStyles.colLabel]}>{t('scanner.qty')}</Text>
        <Text style={[styles.colDesc, dynamicStyles.colLabel]}>{t('scanner.description')}</Text>
        <Text style={[styles.colPrice, dynamicStyles.colLabel]}>{t('scanner.price')}</Text>
      </View>
      <View>
        {items.map((item, idx) => (
          <View key={idx} style={[styles.tableRow, dynamicStyles.tableRow]}>
            <Text style={[styles.colQty, dynamicStyles.colText]}>{item.quantity}</Text>
            <View style={styles.colDesc}>
              <Text style={[styles.itemName, dynamicStyles.itemName]}>{item.name}</Text>
              {item.unitPrice && item.unitPrice !== item.totalPrice && (
                <Text style={[styles.itemUnitPrice, dynamicStyles.itemUnitPrice]}>
                  {formatCurrency(item.unitPrice)} {t('scanner.each')}
                </Text>
              )}
            </View>
            <Text style={[styles.colPrice, dynamicStyles.colText]}>{formatCurrency(item.totalPrice)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    padding: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    padding: 16,
  },
  colQty: {
    width: 48,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  colDesc: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  colPrice: {
    width: 80,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemUnitPrice: {
    fontSize: 12,
    marginTop: 2,
  },
});
