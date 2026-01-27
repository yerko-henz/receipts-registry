import * as React from 'react';
import { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Button, LayoutChangeEvent, PanResponder, ScrollView } from 'react-native';
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
  
  // Drag Selection State
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const calendarLayout = useRef<{x: number, y: number, width: number, height: number} | null>(null);

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

  const onMonthChange = useCallback((month: any) => {
      setCurrentMonth(month.dateString);
      currentMonthRef.current = month.dateString;
  }, []);

  const handleDayPress = useCallback((day: DateData) => {
    const dateString = day.dateString;
    Haptics.selectionAsync();

    if (!startDate || (startDate && endDate)) {
      onRangeChange(dateString, null);
    } else if (startDate && !endDate) {
      if (isBefore(parseISO(dateString), parseISO(startDate))) {
        onRangeChange(dateString, null);
      } else {
        onRangeChange(startDate, dateString);
      }
    }
  }, [startDate, endDate, onRangeChange]);

  // Optimization: Cache grid start dates to avoid date math on every move event
  const gridStartCache = useRef<{month: string, start: Date} | null>(null);

  const calculateDateFromCoordinatesRef = (x: number, y: number) => {
      if (!calendarLayout.current) return null;
      const { width, height } = calendarLayout.current;
      const HEADER_OFFSET = 50; 
      if (y < HEADER_OFFSET) return null; 
      const gridHeight = height - HEADER_OFFSET;
      const rowHeight = gridHeight / 6; 
      const colWidth = width / 7;
      const col = Math.floor(x / colWidth);
      const row = Math.floor((y - HEADER_OFFSET) / rowHeight);
      if (col < 0 || col > 6 || row < 0 || row > 5) return null;
      
      let gridStart: Date;
      if (gridStartCache.current && gridStartCache.current.month === currentMonthRef.current) {
          gridStart = gridStartCache.current.start;
      } else {
          const monthStart = startOfMonth(parseISO(currentMonthRef.current));
          gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); 
          gridStartCache.current = { month: currentMonthRef.current, start: gridStart };
      }
      
      const dayOffset = (row * 7) + col;
      const resultDate = addDays(gridStart, dayOffset);
      return format(resultDate, 'yyyy-MM-dd');
  };
  
  // Re-assign the function used in PR
  const calculateDate = calculateDateFromCoordinatesRef;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
          const { locationY } = evt.nativeEvent;
          return locationY > 50; 
      },
      onPanResponderGrant: (evt, gestureState) => {
          const { locationX, locationY } = evt.nativeEvent;
          const date = calculateDate(locationX, locationY);
          if (date) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setDragStart(date);
            setDragEnd(date); 
          }
      },
      onPanResponderMove: (evt, gestureState) => {
          const { locationX, locationY } = evt.nativeEvent;
          const date = calculateDate(locationX, locationY);
          
          if (date && date !== dragSelectionRef.current.end) {
             Haptics.selectionAsync();
             setDragEnd(date);
             dragSelectionRef.current.end = date;
          }
      },
      onPanResponderRelease: (evt, gestureState) => {
          finishDrag();
      },
      onPanResponderTerminate: () => {
          finishDrag();
      }
    })
  ).current;

  // We need refs to track drag state inside PanResponder without re-binding it constantly
  // or use a ref for the current dragEnd
  const dragSelectionRef = useRef<{start: string|null, end: string|null}>({ start: null, end: null });

  const finishDrag = () => {
      const { start, end } = dragSelectionRef.current;
      
      if (start && end) {
           const s = isBefore(parseISO(start), parseISO(end)) ? start : end;
           const e = isBefore(parseISO(start), parseISO(end)) ? end : start;
           onRangeChange(s, e);
           // Success haptic
           Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (start) {
          onRangeChange(start, null);
      }
      
      setDragStart(null);
      setDragEnd(null);
      dragSelectionRef.current = { start: null, end: null };
  };

  const panResponderRef = useRef(panResponder);
  const currentMonthRef = useRef(currentMonth);
  currentMonthRef.current = currentMonth;
  
  // Memoize PR logic slightly differently or just re-create since we use refs now?
  // Actually, standard PanResponder creation usually depends on nothing if using refs.
  const memoizedPanResponder = useMemo(() => PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
           const { locationY } = evt.nativeEvent;
           return locationY > 50; 
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
           const { locationY } = evt.nativeEvent;
           return locationY > 50;
      },
      onPanResponderGrant: (evt, gestureState) => {
          const { locationX, locationY } = evt.nativeEvent;
          const date = calculateDate(locationX, locationY); 
          if (date) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            dragSelectionRef.current = { start: date, end: date };
            setDragStart(date);
            setDragEnd(date);
          }
      },
      onPanResponderMove: (evt, gestureState) => {
          const { locationX, locationY } = evt.nativeEvent;
          const date = calculateDate(locationX, locationY);
          if (date && date !== dragSelectionRef.current.end) {
             Haptics.selectionAsync();
             dragSelectionRef.current.end = date;
             setDragEnd(date);
          }
      },
      onPanResponderRelease: () => {
          finishDrag();
      },
      onPanResponderTerminate: () => {
          finishDrag();
      }
  }), []); 

  const effectiveStart = dragStart && dragEnd && isBefore(parseISO(dragEnd), parseISO(dragStart)) ? dragEnd : (dragStart || startDate);
  const effectiveEnd = dragStart && dragEnd && isBefore(parseISO(dragEnd), parseISO(dragStart)) ? dragStart : (dragEnd || endDate);

  const markedDates = useMemo(() => {
    const marks: any = {};
    const start = effectiveStart;
    const end = effectiveEnd;

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
  }, [effectiveStart, effectiveEnd, colors]);


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
        onPress={() => setModalVisible(true)}
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
                    <View 
                        {...memoizedPanResponder.panHandlers}
                        onLayout={(e) => {
                            calendarLayout.current = e.nativeEvent.layout;
                        }}
                        collapsable={false}
                        style={{ width: '100%' }}
                    >
                            <Calendar
                                current={currentMonth}
                                onMonthChange={onMonthChange}
                                markingType={'period'}
                                markedDates={markedDates}
                                onDayPress={handleDayPress}
                                firstDay={0} 
                                hideExtraDays={false}
                                enableSwipeMonths={false} 
                                theme={theme}
                            />
                    </View>
                    
                    {/* 
                        FIX: `pointerEvents="none"` on Calendar disables month navigation!
                        Strategy: 
                        1. Remove pointerEvents="none".
                        2. PanResponder `onMoveShouldSetPanResponder` only returns true if we drag. 
                        3. `onStartShouldSetPanResponder` returns true if we touch the GRID area (y > 50).
                           This allows header (y < 50) touches to pass through to the Calendar buttons.
                    */}
                    
                    <View style={{position: 'absolute', top: 16, right: 16, left: 16, height: 50, zIndex: -1}}>
                        {/* Placeholder for header area logic if needed */}
                    </View>
                    
                    <Pressable style={[styles.closeBtn, { backgroundColor: colors.tint }]} onPress={() => setModalVisible(false)}>
                        <Text style={styles.closeBtnText}>Done</Text>
                    </Pressable>
              </Animated.View>
          </Pressable>
      </Modal>
    </>
  );
}

// ... Styles remain similar ...

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
