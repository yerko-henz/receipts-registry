import { describe, it, expect } from 'vitest';
import { groupReceiptsByDay } from '../date';
import { Receipt } from '../services/receipts';
import { format, subDays } from 'date-fns';

// Helper to create test receipts
function createTestReceipt(overrides: Partial<Receipt> = {}, date: Date = new Date()): Receipt {
  return {
    id: `test-${Date.now()}-${Math.random()}`,
    user_id: 'test-user',
    merchant_name: 'Test Store',
    total_amount: 10000,
    currency: 'CLP',
    transaction_date: format(date, 'yyyy-MM-dd'),
    category: 'Food',
    created_at: date.toISOString(),
    raw_ai_output: {
      date: format(date, 'yyyy-MM-dd'),
      items: [],
      total: 10000,
      taxRate: 0.19,
      category: 'Food',
      currency: 'CLP',
      discount: 0,
      taxAmount: 1900,
      merchantName: 'Test Store',
      integrityScore: 100
    },
    ...overrides
  };
}

describe('groupReceiptsByDay', () => {
  it('should group receipts by day correctly', () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const twoDaysAgo = subDays(today, 2);

    const receipts: Receipt[] = [createTestReceipt({ total_amount: 5000 }, today), createTestReceipt({ total_amount: 3000 }, today), createTestReceipt({ total_amount: 2000 }, yesterday), createTestReceipt({ total_amount: 10000 }, twoDaysAgo)];

    const result = groupReceiptsByDay(receipts, 3, 'en', 'transaction');

    expect(result).toHaveLength(3);

    // Today
    expect(result[2].dateKey).toBe(format(today, 'yyyy-MM-dd'));
    expect(result[2].count).toBe(2);
    expect(result[2].totalSpent).toBe(8000);
    expect(result[2].isToday).toBe(true);

    // Yesterday
    expect(result[1].dateKey).toBe(format(yesterday, 'yyyy-MM-dd'));
    expect(result[1].count).toBe(1);
    expect(result[1].totalSpent).toBe(2000);

    // Two days ago
    expect(result[0].dateKey).toBe(format(twoDaysAgo, 'yyyy-MM-dd'));
    expect(result[0].count).toBe(1);
    expect(result[0].totalSpent).toBe(10000);
  });

  it('should handle receipts with null transaction_date by falling back to created_at', () => {
    const today = new Date();
    const receipt = createTestReceipt(
      {
        transaction_date: null,
        created_at: today.toISOString()
      },
      today
    );

    const result = groupReceiptsByDay([receipt], 1, 'en', 'transaction');

    expect(result[0].count).toBe(1);
    expect(result[0].totalSpent).toBe(10000);
  });

  it('should exclude receipts outside the date range', () => {
    const today = new Date();
    const oldDate = subDays(today, 10);

    const receipts: Receipt[] = [createTestReceipt({}, today), createTestReceipt({}, oldDate)];

    const result = groupReceiptsByDay(receipts, 7, 'en', 'transaction');

    // Only today's receipt should be in the last 7 days
    expect(result.reduce((sum, d) => sum + d.count, 0)).toBe(1);
  });

  it('should handle empty receipts array', () => {
    const result = groupReceiptsByDay([], 7, 'en', 'transaction');

    expect(result).toHaveLength(7);
    result.forEach((day) => {
      expect(day.count).toBe(0);
      expect(day.totalSpent).toBe(0);
    });
    // Today should still be marked as isToday based on date
    const todayData = result.find((d) => d.isToday);
    expect(todayData).toBeDefined();
  });

  it('should correctly identify today', () => {
    const today = new Date();
    const receipts = [createTestReceipt({}, today)];

    const result = groupReceiptsByDay(receipts, 7, 'en', 'transaction');

    const todayData = result.find((d) => d.isToday);
    expect(todayData).toBeDefined();
    expect(todayData?.count).toBe(1);
  });

  it('should respect dateMode parameter', () => {
    const today = new Date();
    const createdDate = subDays(today, 1);

    const receipt = createTestReceipt(
      {
        transaction_date: format(today, 'yyyy-MM-dd'),
        created_at: createdDate.toISOString()
      },
      createdDate
    );

    // Using 'created' mode - should group by created_at (which is yesterday)
    // getLastNDaysKeys(2) returns [yesterday, today] so index 0 = yesterday
    const resultCreated = groupReceiptsByDay([receipt], 2, 'en', 'created');
    expect(resultCreated[0].count).toBe(1); // Should be on first day (yesterday)

    // Using 'transaction' mode (default) - should group by transaction_date (which is today)
    const resultTransaction = groupReceiptsByDay([receipt], 2, 'en', 'transaction');
    expect(resultTransaction[1].count).toBe(1); // Should be on second day (today)
  });
});
