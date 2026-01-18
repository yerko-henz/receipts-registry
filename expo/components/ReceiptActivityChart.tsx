import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
// @ts-ignore - victory-native types might be tricky or missing in this setup
import { CartesianChart, Bar } from 'victory-native';
import { matchFont as matchFontSkia } from '@shopify/react-native-skia';
import { Receipt } from '@/services/receipts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface Props {
  receipts: Receipt[];
}

export default function ReceiptActivityChart({ receipts }: Props) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  // Use a system font
  const font = matchFontSkia({
    fontFamily: Platform.select({ ios: "Helvetica", android: "sans-serif", default: "sans-serif" }),
    fontSize: 12,
    fontWeight: "normal",
  });

  const data = useMemo(() => {
    // Dynamic Reference Date: Today
    // We adjust to noon to ensure date math is safe from timezone shifts
    const now = new Date();
    const REF_DATE_STR = now.toISOString().split('T')[0];
    
    // Generate last 7 days keys (YYYY-MM-DD)
    const last7Days: string[] = [];
    const refDate = new Date(REF_DATE_STR + 'T12:00:00'); 
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    // Initialize counts
    const counts: Record<string, number> = {};
    last7Days.forEach(day => {
      counts[day] = 0;
    });

    // Aggregate receipts
    receipts.forEach(r => {
      // User requested to use created_at (upload date) instead of transaction_date
      const rawDate = (r as any).created_at || r.transaction_date;
      if (rawDate) {
        // Safe extraction of date part
        let dateKey = '';
        if (rawDate.includes('T')) {
           dateKey = rawDate.split('T')[0];
        } else {
           // Assume YYYY-MM-DD format if no T
           dateKey = rawDate;
        }

        if (counts[dateKey] !== undefined) {
          counts[dateKey] += 1;
        }
      }
    });

    // Format for chart
    return last7Days.map(dateKey => ({
      label: getDayName(dateKey),
      count: counts[dateKey],
      isToday: dateKey === REF_DATE_STR,
      dateKey,
    }));
  }, [receipts]);

  // Determine max value for Y axis domain
  const maxCount = Math.max(...data.map(d => d.count));
  const totalReceipts = data.reduce((sum, d) => sum + d.count, 0);
  
  // Create ticks:
  // If maxCount is small (e.g. 3), we want 0, 1, 2, 3 (4 ticks).
  // If maxCount is 0, we want 0, 1 (2 ticks).
  // If maxCount is large, we cap at ~6 ticks (e.g. 0, 20, 40, 60, 80, 100).
  const yTickCount = maxCount <= 5 ? (maxCount > 0 ? maxCount + 1 : 2) : 6;

  return (
    <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>Weekly Activity</Text>
        <Text style={[styles.subtitle, { color: themeColors.icon }]}>Loaded {totalReceipts} receipts this week</Text>
      </View>
      
      <View style={styles.chartContainer}>
        <CartesianChart
          data={data}
          xKey="label"
          yKeys={["count"]}
          // Add padding to domain so bars aren't cut off
          domainPadding={{ left: 20, right: 20, top: 10, bottom: 0 }}
          axisOptions={{
            font,
            // Explicitly set x ticks to 7 to show all days, y ticks based on data
            tickCount: { x: 7, y: yTickCount } as any,
            lineColor: themeColors.border,
            labelColor: themeColors.icon,
            formatXLabel: (val) => val,
            // Hide 0 and non-integers to prevent duplicates (e.g. 0.5 -> 1)
            formatYLabel: (val) => (val === 0 || val % 1 !== 0) ? '' : val.toFixed(0), 
          }}
        >
          {({ points, chartBounds }) => {
            const todayPoints = points.count.filter((_, index) => data[index]?.isToday);
            const otherPoints = points.count.filter((_, index) => !data[index]?.isToday);

            return (
              <>
                <Bar
                  points={otherPoints}
                  chartBounds={chartBounds}
                  color={themeColors.icon} // Use icon color for secondary bars
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                  barWidth={24}
                  opacity={0.5} // Make them more subtle
                />
                <Bar
                  points={todayPoints}
                  chartBounds={chartBounds}
                  color={themeColors.tint}
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                  barWidth={24}
                />
              </>
            );
          }}
        </CartesianChart>
      </View>
    </View>
  );
}

// Helper to get formatted day name
const getDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone shifts
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  chartContainer: {
    height: 220,
    width: '100%',
  },
});
