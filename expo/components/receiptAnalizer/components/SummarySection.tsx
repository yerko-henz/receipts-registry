import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

interface SummarySectionProps {
  taxAmount?: number;
  discount?: number;
  total: number;
  currency: string;
}

export const SummarySection: React.FC<SummarySectionProps> = ({ 
  taxAmount, 
  discount, 
  total, 
  currency 
}) => {
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.replace(/[^A-Z]/g, '') || 'USD',
      currencyDisplay: 'narrowSymbol'
    }).format(val).replace('USD', '$');
  };

  const dynamicStyles = StyleSheet.create({
    summaryContainer: {
      backgroundColor: activeTheme === 'dark' ? '#1f1f1f' : '#f8fafc',
    },
    totalLabel: {
      color: themeColors.text,
    },
    totalRow: {
        borderTopColor: themeColors.border,
    },
    summaryLabel: {
        color: themeColors.text,
        opacity: 0.8,
    },
    summaryValue: {
        color: themeColors.text,
    },
    totalValue: {
        color: themeColors.tint,
    },
  });

  return (
    <View style={[styles.summaryContainer, dynamicStyles.summaryContainer]}>
      {taxAmount !== undefined && (
        <View style={styles.summaryRow}>
          <View style={styles.taxLabelRow}>
            <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Tax/IVA</Text>
          </View>
          <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>{formatCurrency(taxAmount)}</Text>
        </View>
      )}

      {discount !== undefined && discount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Discount</Text>
          <Text style={[styles.summaryValue, styles.discountText]}>-{formatCurrency(discount)}</Text>
        </View>
      )}

      <View style={[styles.totalRow, dynamicStyles.totalRow]}>
        <Text style={[styles.totalLabel, dynamicStyles.totalLabel]}>Total Amount</Text>
        <Text style={[styles.totalValue, dynamicStyles.totalValue]}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    padding: 24,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  taxLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountText: {
    color: '#059669',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900', // black
  },
});
