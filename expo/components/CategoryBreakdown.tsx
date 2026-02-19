import * as React from 'react';
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { CommonStyles } from '@/constants/Styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCategoryIcon, CATEGORY_COLORS, RECEIPT_CATEGORIES, ReceiptCategory } from '@/constants/categories';
import { ProgressBar } from '@/components/receiptAnalizer/components/ProgressBar';

import { DayData } from '@/lib/date';
import { formatPrice } from '@/lib/currency';

interface Props {
  data: DayData[];
}

export default function CategoryBreakdown({ data }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const categoryData = useMemo(() => {
    // 1. Flatten receipts from day buckets
    const filtered = data.flatMap(d => d.receipts);

    const totalPeriodSpent = filtered.reduce((sum, r) => sum + (r.total_amount || 0), 0);

    // 2. Group by category
    const groups: Record<string, number> = {};
    filtered.forEach(r => {
      const cat = r.category || 'Other';
      groups[cat] = (groups[cat] || 0) + (r.total_amount || 0);
    });

    // 3. Convert to array and sort
    const dataGroups = Object.keys(groups).map(cat => {
      const amount = groups[cat];
      const percentage = totalPeriodSpent > 0 ? (amount / totalPeriodSpent) * 100 : 0;
      return {
        category: cat,
        amount,
        percentage,
      };
    });

    return {
      total: totalPeriodSpent,
      categories: dataGroups.sort((a, b) => b.amount - a.amount),
    };
  }, [data]);

  if (categoryData.categories.length === 0) return null;

  return (
    <View style={[CommonStyles.getCardStyle(colors), { padding: 20 }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('chart.spendingBreakdown', { defaultValue: 'Spending Breakdown' })}
      </Text>

      <View style={styles.list}>
        {categoryData.categories.map((item) => {
          const Icon = getCategoryIcon(item.category);
          
          return (
            <View key={item.category} style={styles.itemContainer}>
              {/* Row 1: Icon, Name, Amount, Percentage Label */}
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                    <Icon size={20} color={colors.icon} />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {t(`receipts.filters.${item.category}`, { defaultValue: item.category })}
                  </Text>
                </View>
                
                <View style={styles.right}>
                   <Text style={[styles.amount, { color: colors.text }]}>
                      {formatPrice(item.amount)}
                   </Text>
                   <Text style={[styles.percentageText, { color: colors.icon }]}>
                      {item.percentage.toFixed(1)}%
                   </Text>
                </View>
              </View>

              {/* Row 2: Progress Bar */}
              <View style={styles.progressBarContainer}>
                  <ProgressBar 
                    progress={item.percentage} 
                    color={CATEGORY_COLORS[(RECEIPT_CATEGORIES.find(c => c.toLowerCase() === item.category.toLowerCase()) || 'Other') as ReceiptCategory]} 
                    style={{ marginBottom: 0 }} 
                  />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700', // Manrope Bold usually
    marginBottom: 16,
    fontFamily: 'Manrope_700Bold',
  },
  list: {
    gap: 20,
  },
  itemContainer: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
  },
  categoryName: {
      fontSize: 16,
      fontFamily: 'Manrope_600SemiBold',
  },
  right: {
      alignItems: 'flex-end',
  },
  amount: {
      fontSize: 16,
      fontFamily: 'Manrope_700Bold',
  },
  percentageText: {
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
  },
  progressBarContainer: {
     marginTop: 4,
  }
});
