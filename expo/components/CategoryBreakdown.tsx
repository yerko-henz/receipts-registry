import * as React from 'react';
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Receipt } from '@/services/receipts';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '@/constants/categories';
import { ProgressBar } from '@/components/receiptAnalizer/components/ProgressBar';
import { filterReceiptsByDays } from '@/lib/date';

interface Props {
  receipts: Receipt[];
  days: number;
}

export default function CategoryBreakdown({ receipts, days }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const categoryData = useMemo(() => {
    // 1. Filter receipts by date range using shared logic
    const filtered = filterReceiptsByDays(receipts, days);

    const totalPeriodSpent = filtered.reduce((sum, r) => sum + (r.total_amount || 0), 0);

    // 2. Group by category
    const groups: Record<string, number> = {};
    filtered.forEach(r => {
      const cat = r.category || 'Other';
      groups[cat] = (groups[cat] || 0) + (r.total_amount || 0);
    });

    // 3. Convert to array and sort
    const data = Object.keys(groups).map(cat => {
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
      categories: data.sort((a, b) => b.amount - a.amount),
    };
  }, [receipts, days]);

  if (categoryData.categories.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('chart.spendingBreakdown', { defaultValue: 'Spending Breakdown' })}
      </Text>

      <View style={styles.list}>
        {categoryData.categories.map((item) => {
          const Icon = CATEGORY_ICONS[item.category] || DEFAULT_CATEGORY_ICON;
          
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
                      ${item.amount.toFixed(2)}
                   </Text>
                   <Text style={[styles.percentageText, { color: colors.icon }]}>
                      {item.percentage.toFixed(1)}%
                   </Text>
                </View>
              </View>

              {/* Row 2: Progress Bar */}
              <View style={styles.progressBarContainer}>
                  <ProgressBar progress={item.percentage} color={colors.tint} style={{ marginBottom: 0 }} />
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
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 2,
    borderWidth: 1,
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
