import { toLocalISOString, getLastNDaysKeys, filterReceiptsByDays, groupReceiptsByDay } from '../date';
import { Receipt } from '@/services/receipts';

// Mock date-fns to control "now"
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    // We don't mock subDays/format etc, just use them as-is
  };
});

describe('date utilities', () => {
  describe('toLocalISOString', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      expect(toLocalISOString(date)).toBe('2024-01-15');
    });
  });

  describe('getLastNDaysKeys', () => {
    it('returns correct number of days', () => {
      const keys = getLastNDaysKeys(7);
      expect(keys).toHaveLength(7);
    });

    it('returns dates in ascending order', () => {
      const keys = getLastNDaysKeys(3);
      // First key should be oldest, last should be today
      expect(keys[0] < keys[2]).toBe(true);
    });
  });

  describe('filterReceiptsByDays', () => {
    it('filters receipts within date range', () => {
      const today = new Date();
      const receipts: Partial<Receipt>[] = [
        { id: '1', created_at: today.toISOString() },
        { id: '2', created_at: new Date(2020, 0, 1).toISOString() }, // Old receipt
      ];
      
      const filtered = filterReceiptsByDays(receipts as Receipt[], 7);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });

  describe('groupReceiptsByDay', () => {
    it('groups receipts correctly', () => {
      const today = new Date();
      const receipts: Partial<Receipt>[] = [
        { id: '1', created_at: today.toISOString(), total_amount: 50 },
        { id: '2', created_at: today.toISOString(), total_amount: 30 },
      ];
      
      const grouped = groupReceiptsByDay(receipts as Receipt[], 'en', 'created');
      const todayData = grouped.find(d => d.isToday);
      
      expect(todayData).toBeDefined();
      expect(todayData?.count).toBe(2);
      expect(todayData?.totalSpent).toBe(80);
    });

    it('returns 7 days', () => {
      const grouped = groupReceiptsByDay([], 'en');
      expect(grouped).toHaveLength(7);
    });
  });
});
