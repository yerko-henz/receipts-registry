import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Modal, Pressable, Animated } from 'react-native';
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

  // Use a system font for chart to ensure numbers appear (Skia limitation with Expo loaded fonts)
  const font = matchFontSkia({
    fontFamily: Platform.select({ ios: "Helvetica", android: "sans-serif", default: "sans-serif" }),
    fontSize: 12,
    fontWeight: "normal",
  });

  // Compute final data from receipts
  const finalData = useMemo(() => {
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

  // State for animated chart data
  const [chartData, setChartData] = useState(() => 
     // Start at 0
     finalData.map(d => ({ ...d, count: 0 }))
  );
  
  const hasAnimated = React.useRef(false);

  useEffect(() => {
    const totalCount = finalData.reduce((sum, d) => sum + d.count, 0);

    // If we've already animated once, just update the data directly without the "grow" effect.
    // This prevents re-animation when switching tabs or refetching valid data.
    if (hasAnimated.current) {
        setChartData(finalData);
        return;
    }

    // optimizing: If there's no data to show, just set it and wait.
    // Don't burn the "hasAnimated" flag on an empty chart (initial load).
    if (totalCount === 0) {
       setChartData(finalData);
       return;
    }

    // If we have data and haven't animated yet, Trigger the animation!
    hasAnimated.current = true;

    let startTime: number | null = null;
    let animationFrameId: number;
    const DURATION = 800; // Increased duration for smoother settle

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / DURATION, 1);
      
      // Easing: Exponential Ease Out (Aggressive start, soft finish)
      // 1 - 2^(-10t)
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setChartData(
        finalData.map(d => ({
          ...d,
          count: d.count * ease
        }))
      );

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [finalData]);

  // Determine max value for Y axis domain from FINAL data
  const maxCount = Math.max(...finalData.map(d => d.count));
  const totalReceipts = finalData.reduce((sum, d) => sum + d.count, 0);
  
  // Create ticks:
  const yTickCount = maxCount <= 5 ? (maxCount > 0 ? maxCount + 1 : 2) : 6;

  // State for Chart Interaction
  const [chartWidth, setChartWidth] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animations
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Filter receipts for the selected date
  const selectedReceipts = useMemo(() => {
    if (!selectedDate) return [];
    return receipts.filter(r => {
      const rawDate = (r as any).created_at || r.transaction_date;
      if (!rawDate) return false;
      return rawDate.startsWith(selectedDate);
    });
  }, [selectedDate, receipts]);

  const openModal = () => {
      setModalVisible(true);
      Animated.parallel([
          Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
          })
      ]).start();
  };

  const closeModal = () => {
      Animated.parallel([
          Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
              toValue: 300, // Slide down
              duration: 200,
              useNativeDriver: true,
          })
      ]).start(() => {
          setModalVisible(false);
          setSelectedDate(null);
      });
  };

  const handleChartPress = (x: number) => {
    if (chartWidth === 0) return;
    
    // Account for domainPadding (20px left)
    const padding = 20;
    const chartContentWidth = chartWidth - (padding * 2);
    
    let adjustedX = x - padding;

    if (adjustedX < 0 && adjustedX > -20) adjustedX = 0;
    if (adjustedX > chartContentWidth && adjustedX < chartContentWidth + 20) adjustedX = chartContentWidth - 1;

    if (adjustedX < 0 || adjustedX > chartContentWidth) {
        return;
    }

    const slotWidth = chartContentWidth / 7;
    const index = Math.min(Math.max(Math.floor(adjustedX / slotWidth), 0), 6);

    if (index >= 0 && index < finalData.length) {
      const item = finalData[index];
      setSelectedDate(item.dateKey);
      openModal();
    }
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>Weekly Activity</Text>
        </View>
        
        <View 
          style={styles.chartContainer} 
          onLayout={(e) => {
              setChartWidth(e.nativeEvent.layout.width);
          }}
        >
          <CartesianChart
            data={chartData}
            xKey="label"
            yKeys={["count"]}
            domain={{ y: [0, maxCount > 0 ? maxCount : 1] }} 
            domainPadding={{ left: 20, right: 20, top: 10, bottom: 0 }}
            axisOptions={{
              font,
              tickCount: { x: 7, y: yTickCount } as any,
              lineColor: themeColors.border,
              labelColor: themeColors.icon,
              formatXLabel: (val) => val,
              formatYLabel: (val) => (val === 0 || val % 1 !== 0) ? '' : val.toFixed(0), 
            }}
          >
            {({ points, chartBounds }) => {
              // We render ALL bars in the secondary style (background layer)
              // Then render the "Today" bar on top in the primary style.
              const todayPoints = points.count.filter((_, index) => finalData[index]?.isToday);

              return (
                <>
                  <Bar
                     points={points.count}
                     chartBounds={chartBounds}
                     color={themeColors.icon}
                     roundedCorners={{ topLeft: 6, topRight: 6 }}
                     barWidth={24}
                     opacity={0.5}
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

          {/* Absolute Overlay for Interaction */}
          <Pressable 
            style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
            onPress={(e) => handleChartPress(e.nativeEvent.locationX)}
          />
        </View>
      </View>

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent={true}
      >
        <Animated.View 
            style={[
                styles.modalOverlay, 
                { opacity: fadeAnim }
            ]}
        >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
            
            <Animated.View 
                style={[
                    styles.modalContent, 
                    { 
                        backgroundColor: themeColors.card,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
            >
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                        {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
                    </Text>
                    <Pressable onPress={closeModal} hitSlop={10}>
                        <Text style={{ color: themeColors.icon, fontSize: 20 }}>✕</Text>
                    </Pressable>
                </View>

                {selectedReceipts.length === 0 ? (
                    <Text style={{ color: themeColors.icon, textAlign: 'center', marginVertical: 20 }}>
                        No receipts uploaded on this day.
                    </Text>
                ) : (
                    <View>
                        {selectedReceipts.map((r, i) => (
                            <View key={r.id || i} style={[styles.receiptItem, { borderBottomColor: themeColors.border }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.receiptMerchant, { color: themeColors.text }]}>{r.merchant_name || 'Unknown Merchant'}</Text>
                                    <Text style={[styles.receiptCategory, { color: themeColors.icon }]}>{r.category || 'Uncategorized'}</Text>
                                </View>
                                <Text style={[styles.receiptAmount, { color: themeColors.text }]}>
                                    {r.currency} {r.total_amount?.toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </Animated.View>
        </Animated.View>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
    paddingBottom: 40, // for safe area
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  receiptMerchant: {
    fontSize: 16,
    fontWeight: '600',
  },
  receiptCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
