import { Receipt } from '@/lib/services/receipts';
import { groupReceiptsByDay, DayData } from '@/lib/date';
import { startOfMonth, endOfMonth, subMonths, parseISO, isAfter, isBefore, isSameDay, subDays, format } from 'date-fns';

export interface DashboardStats {
  totalSpent: number;
  itemsProcessed: number;
  newScansToday: number;
  spendTrend: number | null;
  countTrend: number | null;
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

/**
 * Calculate dashboard stats from receipts (exact logic from DashboardContent)
 */
export function calculateDashboardStats(receipts: Receipt[], viewMode: 'weekly' | 'monthly', dateMode: 'transaction' | 'created' = 'transaction'): DashboardStats {
  // Group data based on view mode
  const days = viewMode === 'weekly' ? 7 : new Date().getDate();
  const dailyData: DayData[] = groupReceiptsByDay(receipts, days, 'en', dateMode);

  // Derive main stats directly from dailyData
  const totalSpent = dailyData.reduce((sum, day) => sum + day.totalSpent, 0);
  const itemsProcessed = dailyData.reduce((sum, day) => sum + day.count, 0);

  // Find today's stats
  const todayData = dailyData.find((d) => d.isToday);
  const newScansToday = todayData ? todayData.count : 0;

  // Calculate previous period for trends
  const now = new Date();
  const getPreviousPeriodReceipts = (): Receipt[] => {
    if (viewMode === 'weekly') {
      // Compare vs previous 7 days (rolling)
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now);
      endDate.setDate(now.getDate() - 7);
      endDate.setHours(23, 59, 59, 999);

      return receipts.filter((r) => {
        const dateStr = r.transaction_date || r.created_at;
        if (!dateStr) return false;
        const rDate = parseISO(dateStr);
        return (isAfter(rDate, startDate) || isSameDay(rDate, startDate)) && (isBefore(rDate, endDate) || isSameDay(rDate, endDate));
      });
    } else {
      // Compare vs Previous Calendar Month (Full)
      const prevMonthDate = subMonths(now, 1);
      const startDate = startOfMonth(prevMonthDate);
      const endDate = endOfMonth(prevMonthDate);

      return receipts.filter((r) => {
        const dateStr = r.transaction_date || r.created_at;
        if (!dateStr) return false;
        const rDate = parseISO(dateStr);
        return (isAfter(rDate, startDate) || isSameDay(rDate, startDate)) && (isBefore(rDate, endDate) || isSameDay(rDate, endDate));
      });
    }
  };

  const previousReceipts = getPreviousPeriodReceipts();
  const previousStats = {
    totalSpent: previousReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0),
    count: previousReceipts.length
  };

  const calculateTrend = (curr: number, prev: number): number | null => {
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const spendTrend = calculateTrend(totalSpent, previousStats.totalSpent);
  const countTrend = calculateTrend(itemsProcessed, previousStats.count);

  return {
    totalSpent,
    itemsProcessed,
    newScansToday,
    spendTrend,
    countTrend
  };
}

/**
 * Get category breakdown from daily data (matches CategoryBreakdown component logic)
 */
export function getCategoryBreakdown(dailyData: DayData[], topN: number = 5): CategoryData[] {
  const categoryTotals: Record<string, number> = {};
  let totalSpent = 0;

  // Aggregate all receipts from daily data
  dailyData.forEach((day) => {
    day.receipts.forEach((receipt) => {
      const category = receipt.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + (receipt.total_amount || 0);
      totalSpent += receipt.total_amount || 0;
    });
  });

  // Convert to array, sort by amount descending, and limit to top N
  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, topN);
}

/**
 * Generate 2 months of realistic mock receipt data for testing
 */
export function generateTwoMonthMockData(userId: string = 'test-user'): Receipt[] {
  const receipts: Receipt[] = [];
  const today = new Date();
  const merchants = ['LIDER', 'CENCOSUD RETAIL S.A.', 'TOTTUS', 'JUMBO', 'SMU', 'UNIMARC', 'WALMART', 'FALABELLA', 'RIPLEY', 'MOVISTAR'];
  const categories = ['Food', 'Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Groceries', 'Gas', 'Health', 'Other'];

  // Generate receipts for the last 60 days
  for (let i = 0; i < 60; i++) {
    const date = subDays(today, i);
    // Random number of receipts per day (0-4)
    const count = Math.floor(Math.random() * 5);

    for (let j = 0; j < count; j++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      // Random amount between 1,000 and 50,000 CLP
      const totalAmount = Math.floor(Math.random() * 49000) + 1000;
      const taxRate = 0.19;
      const taxAmount = Math.round(totalAmount * taxRate);

      receipts.push({
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        merchant_name: merchant,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        currency: 'CLP',
        transaction_date: format(date, 'yyyy-MM-dd'),
        category: category,
        created_at: date.toISOString(),
        raw_ai_output: {
          date: format(date, 'yyyy-MM-dd'),
          items: [],
          total: totalAmount,
          taxRate: taxRate,
          category: category,
          currency: 'CLP',
          discount: 0,
          taxAmount: taxAmount,
          merchantName: merchant,
          integrityScore: 100
        }
      });
    }
  }

  return receipts;
}
