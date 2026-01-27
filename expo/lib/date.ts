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
