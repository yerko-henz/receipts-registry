import * as React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Calendar as CalendarIcon, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isSameDay, isBefore, startOfMonth, startOfWeek, addDays, getISODay } from 'date-fns';
import Animated, { FadeIn, ZoomIn, FadeOut, ZoomOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface DateRangeFilterProps {
  startDate: string | null;
  endDate: string | null;
  onRangeChange: (start: string | null, end: string | null) => void;
}

export function DateRangeFilter({ startDate, endDate, onRangeChange }: DateRangeFilterProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [modalVisible, setModalVisible] = useState(false);
  
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Temp selection for delayed application
  const [tempStart, setTempStart] = useState<string | null>(startDate);
  const [tempEnd, setTempEnd] = useState<string | null>(endDate);

  // Sync temp state when modal opens
  useEffect(() => {
    if (modalVisible) {
        setTempStart(startDate);
        setTempEnd(endDate);
    }
  }, [modalVisible, startDate, endDate]);
  
  // Optimize theme to avoid re-creation on every render
  const theme = useMemo(() => ({
      backgroundColor: colors.card,
      calendarBackground: colors.card,
      textSectionTitleColor: colors.icon,
      selectedDayBackgroundColor: colors.tint,
      selectedDayTextColor: '#ffffff',
      todayTextColor: colors.tint,
      dayTextColor: colors.text,
      textDisabledColor: colors.border,
      dotColor: colors.tint,
      selectedDotColor: '#ffffff',
      arrowColor: colors.tint,
      monthTextColor: colors.text,
      indicatorColor: colors.tint,
  }), [colors]);

  const onMonthChange = useCallback((month: DateData) => {
      setCurrentMonth(month.dateString);
  }, []);

  const handleDayPress = useCallback((day: DateData) => {
    const dateString = day.dateString;
    Haptics.selectionAsync();

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateString);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (isBefore(parseISO(dateString), parseISO(tempStart))) {
        setTempStart(dateString);
        setTempEnd(tempStart); 
      } else {
        setTempStart(tempStart);
        setTempEnd(dateString);
      }
    }
  }, [tempStart, tempEnd]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { startingDay?: boolean; endingDay?: boolean; color: string; textColor: string }> = {};
    const start = tempStart;
    const end = tempEnd;

    if (start) {
      marks[start] = { startingDay: true, color: colors.tint, textColor: '#FFF' };
      if (end) {
         if (start === end) {
             marks[start] = { startingDay: true, endingDay: true, color: colors.tint, textColor: '#FFF' };
         } else {
            marks[end] = { endingDay: true, color: colors.tint, textColor: '#FFF' };
            
            let current = new Date(parseISO(start));
            const endDateObj = parseISO(end);
            current.setDate(current.getDate() + 1);
            
            while (isBefore(current, endDateObj)) {
                const dateStr = format(current, 'yyyy-MM-dd');
                marks[dateStr] = { color: colors.tint + '40', textColor: colors.text };
                current.setDate(current.getDate() + 1);
            }
         }
      } else {
         marks[start] = { startingDay: true, endingDay: true, color: colors.tint, textColor: '#FFF' };
      }
    }
    return marks;
  }, [tempStart, tempEnd, colors]);


  const displayText = useMemo(() => {
      if (startDate && endDate) {
          return `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d')}`;
      } else if (startDate) {
          return format(parseISO(startDate), 'MMM d');
      }
      return t('receipts.selectDate', { defaultValue: 'Select Date' });
  }, [startDate, endDate, t]);

  return (
    <>
      <Pressable 
        style={[styles.button, { backgroundColor: colors.card, borderColor: (startDate || endDate) ? colors.tint : colors.border }]}
        onPress={() => {
            console.log('[DateRangeFilter] Button Pressed');
            setModalVisible(true);
        }}
      >
        <CalendarIcon size={16} color={colors.icon} />
        <Text style={[styles.text, { color: colors.text }]}>{displayText}</Text>
        {(startDate || endDate) && (
            <Pressable 
                hitSlop={10} 
                onPress={(e) => {
                    e.stopPropagation();
                    onRangeChange(null, null);
                }}
            >
                <X size={14} color={colors.icon} />
            </Pressable>
        )}
      </Pressable>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
              <Animated.View 
                entering={ZoomIn.duration(200)}
                exiting={ZoomOut.duration(200)}
                style={[styles.modalContent, { backgroundColor: colors.card }]} 
                onTouchEnd={(e) => e.stopPropagation()}
              >
                    <View style={{ width: '100%' }}>
                            <Calendar
                                current={currentMonth}
                                onMonthChange={onMonthChange}
                                markingType={'period'}
                                markedDates={markedDates}
                                onDayPress={handleDayPress}
                                firstDay={0} 
                                hideExtraDays={false}
                                enableSwipeMonths={true} 
                                theme={theme}
                            />
                    </View>
                    
                    <View style={{ height: 20 }} />
                    
                    <Pressable 
                        style={[styles.closeBtn, { backgroundColor: colors.tint }]} 
                        onPress={() => {
                            onRangeChange(tempStart, tempEnd);
                            setModalVisible(false);
                        }}
                    >
                        <Text style={styles.closeBtnText}>Done</Text>
                    </Pressable>
              </Animated.View>
          </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  text: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
  },
  modalContent: {
      borderRadius: 16,
      overflow: 'hidden',
      padding: 16,
      width: '100%',
  },
  closeBtn: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
  },
  closeBtnText: {
      color: '#FFF',
      fontFamily: 'Manrope_700Bold',
      fontSize: 16,
  },
});
