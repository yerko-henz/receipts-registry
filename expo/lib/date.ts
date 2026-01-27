import { Receipt } from '@/services/receipts';

// Helper to get local YYYY-MM-DD
export const toLocalISOString = (date: Date): string => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

export const getLastNDaysKeys = (days: number): string[] => {
    const now = new Date();
    const lastNDays: string[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      lastNDays.push(toLocalISOString(d));
    }
    return lastNDays;
};

export const filterReceiptsByDays = (receipts: Receipt[], days: number): Receipt[] => {
    const validKeys = new Set(getLastNDaysKeys(days));
    
    return receipts.filter(r => {
        const rawDate = (r as any).created_at || r.transaction_date;
        if (!rawDate) return false;
        
        const rDate = new Date(rawDate);
        const dateKey = toLocalISOString(rDate);
        return validKeys.has(dateKey);
    });
};

export interface DayData {
    dateKey: string;     // "YYYY-MM-DD"
    dayName: string;     // "Mon"
    receipts: Receipt[]; // The actual receipts for this day
    totalSpent: number;  // Sum of receipts for this day
    count: number;       // Number of receipts
    isToday: boolean;
}
  
export const groupReceiptsByDay = (receipts: Receipt[], language: string = 'en'): DayData[] => {
    const days = 7;
    const now = new Date();
    const REF_DATE_STR = toLocalISOString(now);
    const lastNDays = getLastNDaysKeys(days);
      
    // Create map for O(1) access
    const buckets: Record<string, DayData> = {};
      
    lastNDays.forEach(dateKey => {
         const date = new Date(dateKey + 'T12:00:00');
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
        const rawDate = (r as any).created_at || r.transaction_date;
        if (!rawDate) return;
          
        const rDate = new Date(rawDate);
        const dateKey = toLocalISOString(rDate);
          
        if (buckets[dateKey]) {
            buckets[dateKey].receipts.push(r);
            buckets[dateKey].totalSpent += (r.total_amount || 0);
            buckets[dateKey].count += 1;
        }
    });
  
    return lastNDays.map(key => buckets[key]);
};
