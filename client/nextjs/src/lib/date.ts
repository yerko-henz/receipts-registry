import { Receipt } from '@/lib/services/receipts';
import { format, subDays, parseISO } from 'date-fns';

// Helper to get local YYYY-MM-DD
export const toLocalISOString = (date: Date): string => {
    // date-fns format() uses local time by default
    return format(date, 'yyyy-MM-dd');
};

export const getLastNDaysKeys = (days: number): string[] => {
    const now = new Date();
    const lastNDays: string[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      lastNDays.push(format(d, 'yyyy-MM-dd'));
    }
    return lastNDays;
};

export interface DayData {
    dateKey: string;     // "YYYY-MM-DD"
    dayName: string;     // "Mon"
    receipts: Receipt[]; // The actual receipts for this day
    totalSpent: number;  // Sum of receipts for this day
    count: number;       // Number of receipts
    isToday: boolean;
}
  
export const groupReceiptsByDay = (receipts: Receipt[], language: string = 'en', dateMode: 'transaction' | 'created' = 'transaction'): DayData[] => {
    const days = 7;
    const now = new Date();
    const REF_DATE_STR = format(now, 'yyyy-MM-dd');
    const lastNDays = getLastNDaysKeys(days);
      
    // Create map for O(1) access
    const buckets: Record<string, DayData> = {};
      
    lastNDays.forEach(dateKey => {
         // Create date object for day name formatting. 
         // Must handle timezone carefully so "2023-01-01" yields "Sun" correctly
         const [y, m, d] = dateKey.split('-').map(Number);
         const date = new Date(y, m - 1, d); // Local time construction
         
         buckets[dateKey] = {
             dateKey,
             dayName: date.toLocaleDateString(language, { weekday: 'short' }),
             receipts: [],
             totalSpent: 0,
             count: 0,
             isToday: dateKey === REF_DATE_STR
         };
    });
      
    receipts.forEach(r => {
        // Respect dateMode for grouping
        const rawDate = dateMode === 'created' ? r.created_at : (r.transaction_date || r.created_at);
        if (!rawDate) return;
        
        const rDate = parseISO(rawDate);
        const dateKey = format(rDate, 'yyyy-MM-dd'); // Uses local time
          
        if (buckets[dateKey]) {
            buckets[dateKey].receipts.push(r);
            buckets[dateKey].totalSpent += (r.total_amount || 0);
            buckets[dateKey].count += 1;
        }
    });
  
    return lastNDays.map(key => buckets[key]);
};
