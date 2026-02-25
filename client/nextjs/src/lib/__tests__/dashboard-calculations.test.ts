import { describe, it, expect } from 'vitest';
import { groupReceiptsByDay } from '../date';
import { calculateDashboardStats, getCategoryBreakdown } from '../utils/dashboardCalculations';
import { Receipt } from '../services/receipts';
import { format, subDays } from 'date-fns';

// Helper to create test receipts with realistic data
function createTestReceipt(overrides: Partial<Receipt> = {}, date: Date = new Date(), amount?: number): Receipt {
  const totalAmount = amount ?? Math.floor(Math.random() * 50000) + 1000;
  const taxRate = 0.19;
  const taxAmount = Math.round(totalAmount * taxRate);

  return {
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'test-user',
    merchant_name: 'Test Store',
    total_amount: totalAmount,
    tax_amount: taxAmount,
    currency: 'CLP',
    transaction_date: format(date, 'yyyy-MM-dd'),
    category: 'Food',
    created_at: date.toISOString(),
    raw_ai_output: {
      date: format(date, 'yyyy-MM-dd'),
      items: [],
      total: totalAmount,
      taxRate: taxRate,
      category: 'Food',
      currency: 'CLP',
      discount: 0,
      taxAmount: taxAmount,
      merchantName: 'Test Store',
      integrityScore: 100
    },
    ...overrides
  };
}

describe('Dashboard Calculations with 2 Months of Data', () => {
  describe('groupReceiptsByDay', () => {
    it('should correctly group 2 months of receipts by day', () => {
      const today = new Date();
      const receipts: Receipt[] = [];

      // Generate receipts for the last 60 days
      for (let i = 0; i < 60; i++) {
        const date = subDays(today, i);
        // Random number of receipts per day (0-4)
        const count = Math.floor(Math.random() * 5);
        for (let j = 0; j < count; j++) {
          receipts.push(createTestReceipt({}, date));
        }
      }

      const result = groupReceiptsByDay(receipts, 60, 'en', 'transaction');

      // Should have exactly 60 days
      expect(result).toHaveLength(60);

      // Verify all days are present and dates are in order
      for (let i = 0; i < 60; i++) {
        const expectedDate = format(subDays(today, 59 - i), 'yyyy-MM-dd');
        expect(result[i].dateKey).toBe(expectedDate);
      }

      // Verify total counts match
      const totalReceiptsFromGrouping = result.reduce((sum, d) => sum + d.count, 0);
      expect(totalReceiptsFromGrouping).toBe(receipts.length);

      // Verify total spent matches
      const totalSpentFromGrouping = result.reduce((sum, d) => sum + d.totalSpent, 0);
      const expectedTotalSpent = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      expect(totalSpentFromGrouping).toBe(expectedTotalSpent);
    });

    it('should correctly identify today', () => {
      const today = new Date();
      const yesterday = subDays(today, 1);
      const receipts = [createTestReceipt({}, today), createTestReceipt({}, yesterday)];

      const result = groupReceiptsByDay(receipts, 2, 'en', 'transaction');

      const todayData = result.find((d) => d.isToday);
      expect(todayData).toBeDefined();
      expect(todayData?.dateKey).toBe(format(today, 'yyyy-MM-dd'));
      expect(todayData?.count).toBe(1);
    });

    it('should handle empty data', () => {
      const result = groupReceiptsByDay([], 60, 'en', 'transaction');
      expect(result).toHaveLength(60);
      result.forEach((day) => {
        expect(day.count).toBe(0);
        expect(day.totalSpent).toBe(0);
      });
      // Today should still be marked as isToday based on dateKey
      const todayData = result.find((d) => d.isToday);
      expect(todayData).toBeDefined();
      expect(todayData?.count).toBe(0);
    });
  });

  describe('calculateDashboardStats', () => {
    it('should calculate correct stats for weekly view with 2 months of data', () => {
      const today = new Date();
      const receipts: Receipt[] = [];

      // Generate 2 months of data
      for (let i = 0; i < 60; i++) {
        const date = subDays(today, i);
        const count = Math.floor(Math.random() * 5);
        for (let j = 0; j < count; j++) {
          receipts.push(createTestReceipt({}, date));
        }
      }

      const stats = calculateDashboardStats(receipts, 'weekly');

      // Verify stats are calculated correctly by comparing with direct calculation from dailyData
      const dailyData = groupReceiptsByDay(receipts, 7, 'en', 'transaction');
      const expectedTotalSpent = dailyData.reduce((sum, day) => sum + day.totalSpent, 0);
      const expectedItemsProcessed = dailyData.reduce((sum, day) => sum + day.count, 0);

      expect(stats.totalSpent).toBe(expectedTotalSpent);
      expect(stats.itemsProcessed).toBe(expectedItemsProcessed);
      expect(typeof stats.spendTrend).toBe('number');
      expect(typeof stats.countTrend).toBe('number');
    });

    it('should calculate trend correctly when previous period has data', () => {
      const today = new Date();

      // Create receipts for current week (last 7 days) with known total
      const currentWeekTotal = 100000;
      const currentWeekReceipts: Receipt[] = [];
      for (let i = 0; i < 7; i++) {
        const date = subDays(today, i);
        currentWeekReceipts.push(createTestReceipt({ total_amount: currentWeekTotal / 7 }, date, currentWeekTotal / 7));
      }

      // Create receipts for previous week (days 7-13 ago) with known total
      const previousWeekTotal = 80000;
      const previousWeekReceipts: Receipt[] = [];
      for (let i = 7; i < 14; i++) {
        const date = subDays(today, i);
        previousWeekReceipts.push(createTestReceipt({ total_amount: previousWeekTotal / 7 }, date, previousWeekTotal / 7));
      }

      const allReceipts = [...currentWeekReceipts, ...previousWeekReceipts];
      const stats = calculateDashboardStats(allReceipts, 'weekly');

      expect(stats.totalSpent).toBeCloseTo(currentWeekTotal, 0);
      // Verify trend calculation: (100000 - 80000) / 80000 = 0.25 = 25%
      const expectedTrend = ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100;
      expect(stats.spendTrend).toBeCloseTo(expectedTrend, 1);
    });

    it('should handle zero previous period gracefully', () => {
      const today = new Date();
      const currentWeekTotal = 50000;
      const receipts: Receipt[] = [];

      // Only current week, no previous week
      for (let i = 0; i < 7; i++) {
        const date = subDays(today, i);
        receipts.push(createTestReceipt({}, date, currentWeekTotal / 7));
      }

      const stats = calculateDashboardStats(receipts, 'weekly');

      expect(stats.totalSpent).toBeCloseTo(currentWeekTotal, 0);
      expect(stats.spendTrend).toBeNull();
    });

    it('should correctly calculate newScansToday', () => {
      const today = new Date();
      const receipts: Receipt[] = [];

      // Add some receipts from today
      for (let i = 0; i < 3; i++) {
        receipts.push(createTestReceipt({}, today));
      }

      // Add some receipts from other days
      for (let i = 1; i < 10; i++) {
        const date = subDays(today, i);
        receipts.push(createTestReceipt({}, date));
      }

      const stats = calculateDashboardStats(receipts, 'weekly');

      expect(stats.newScansToday).toBe(3);
    });
  });

  describe('Monthly View Calculations', () => {
    it('should calculate correct stats for monthly view with 2 months of data', () => {
      const today = new Date();
      const receipts: Receipt[] = [];

      // Generate 2 months of data
      for (let i = 0; i < 60; i++) {
        const date = subDays(today, i);
        const count = Math.floor(Math.random() * 5);
        for (let j = 0; j < count; j++) {
          receipts.push(createTestReceipt({}, date));
        }
      }

      const stats = calculateDashboardStats(receipts, 'monthly');

      // Verify current month calculations
      const dailyData = groupReceiptsByDay(receipts, today.getDate(), 'en', 'transaction');
      const expectedTotalSpent = dailyData.reduce((sum, day) => sum + day.totalSpent, 0);
      const expectedItemsProcessed = dailyData.reduce((sum, day) => sum + day.count, 0);

      expect(stats.totalSpent).toBe(expectedTotalSpent);
      expect(stats.itemsProcessed).toBe(expectedItemsProcessed);
    });

    it('should correctly compare current month to previous full month', () => {
      const today = new Date();
      today.setDate(15); // Mid-month for predictable testing

      // Current month: 15 days, $100 per day = $1500
      const currentMonthTotal = 1500;
      const currentMonthReceipts: Receipt[] = [];
      for (let i = 0; i < 15; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
        currentMonthReceipts.push(createTestReceipt({}, date, 100));
      }

      // Previous month: full 30 days, $80 per day = $2400
      const prevMonthTotal = 2400;
      const previousMonthReceipts: Receipt[] = [];
      for (let i = 1; i <= 30; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - 1, i);
        previousMonthReceipts.push(createTestReceipt({}, date, 80));
      }

      const allReceipts = [...currentMonthReceipts, ...previousMonthReceipts];
      const stats = calculateDashboardStats(allReceipts, 'monthly', 'transaction');

      expect(stats.totalSpent).toBe(currentMonthTotal);
      // Verify that previous month total was used for trend calculation
      // The trend should be negative since current < previous
      const expectedTrend = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
      expect(stats.spendTrend).toBeLessThan(0);
      expect(stats.spendTrend).toBeCloseTo(expectedTrend, 1);
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should correctly calculate category totals and percentages', () => {
      const today = new Date();
      const receipts: Receipt[] = [
        createTestReceipt({ category: 'Food', total_amount: 10000 }, today),
        createTestReceipt({ category: 'Food', total_amount: 5000 }, today),
        createTestReceipt({ category: 'Shopping', total_amount: 8000 }, today),
        createTestReceipt({ category: 'Transport', total_amount: 3000 }, today),
        createTestReceipt({ category: 'Food', total_amount: 7000 }, today)
      ];

      const dailyData = groupReceiptsByDay(receipts, 1, 'en', 'transaction');
      const categories = getCategoryBreakdown(dailyData);

      expect(categories[0].category).toBe('Food');
      expect(categories[0].amount).toBe(22000);
      expect(categories[0].percentage).toBeCloseTo(66.67, 1);
      expect(categories[1].category).toBe('Shopping');
      expect(categories[1].amount).toBe(8000);
      expect(categories[1].percentage).toBeCloseTo(24.24, 1);
    });

    it('should limit to top 5 categories', () => {
      const today = new Date();
      // Create 6 categories where Groceries is the smallest (reverse order so Groceries gets 1000)
      const categoryOrder = ['Groceries', 'Entertainment', 'Utilities', 'Transport', 'Shopping', 'Food'];
      const receipts: Receipt[] = categoryOrder.map((cat, i) => createTestReceipt({ category: cat, total_amount: (i + 1) * 1000 }, today));

      const dailyData = groupReceiptsByDay(receipts, 1, 'en', 'transaction');
      const categories = getCategoryBreakdown(dailyData);

      expect(categories).toHaveLength(5);
      // The smallest category (Groceries with 1000) should be excluded
      expect(categories.find((c) => c.category === 'Groceries')).toBeUndefined();
      // The largest category (Food with 6000) should be first
      expect(categories[0].category).toBe('Food');
      expect(categories[0].amount).toBe(6000);
    });
  });

  describe('Data Integrity with 2 Months', () => {
    it('should maintain data consistency across all calculations', () => {
      const today = new Date();
      const receipts: Receipt[] = [];

      // Generate realistic 2-month dataset
      for (let i = 0; i < 60; i++) {
        const date = subDays(today, i);
        const count = Math.floor(Math.random() * 5);
        for (let j = 0; j < count; j++) {
          receipts.push(createTestReceipt({}, date));
        }
      }

      // Calculate daily data
      const dailyData = groupReceiptsByDay(receipts, 60, 'en', 'transaction');
      const totalFromDaily = dailyData.reduce((sum, d) => sum + d.totalSpent, 0);
      const countFromDaily = dailyData.reduce((sum, d) => sum + d.count, 0);

      // Calculate weekly stats using actual function
      const stats = calculateDashboardStats(receipts, 'weekly');

      // Verify weekly stats match the sum of the last 7 days
      const last7Days = dailyData.slice(-7);
      const last7DaysTotal = last7Days.reduce((sum, d) => sum + d.totalSpent, 0);
      const last7DaysCount = last7Days.reduce((sum, d) => sum + d.count, 0);

      expect(stats.totalSpent).toBe(last7DaysTotal);
      expect(stats.itemsProcessed).toBe(last7DaysCount);

      // Verify total consistency
      expect(totalFromDaily).toBe(receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0));
      expect(countFromDaily).toBe(receipts.length);
    });

    it('should handle mixed categories correctly', () => {
      const categories = ['Food', 'Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Groceries', 'Gas', 'Health', 'Other'];
      const receipts: Receipt[] = [];

      // Generate 2 months of data with various categories
      for (let i = 0; i < 60; i++) {
        const date = subDays(new Date(), i);
        const count = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < count; j++) {
          const category = categories[Math.floor(Math.random() * categories.length)];
          receipts.push(createTestReceipt({ category }, date));
        }
      }

      // Verify all categories appear in the data
      const categoriesInData = new Set(receipts.map((r) => r.category));
      expect(categoriesInData.size).toBeGreaterThan(3); // Should have variety

      // Verify totals are consistent
      const totalSpent = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const categorySum = Object.values(
        receipts.reduce(
          (acc, r) => {
            acc[r.category] = (acc[r.category] || 0) + (r.total_amount || 0);
            return acc;
          },
          {} as Record<string, number>
        )
      ).reduce((sum, val) => sum + val, 0);

      expect(categorySum).toBe(totalSpent);
    });
  });
});
