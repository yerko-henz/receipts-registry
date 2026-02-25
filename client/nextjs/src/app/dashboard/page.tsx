'use client';
import React, { useMemo, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { FileCheck, History, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createSPASassClientAuthenticated as createSPASassClient } from '@/lib/supabase/client';
import ReceiptActivityChart from '@/components/dashboard/ReceiptActivityChart';
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown';
import StatCard from '@/components/dashboard/StatCard';
import { groupReceiptsByDay } from '@/lib/date';
import { useRecentReceipts } from '@/lib/hooks/useReceipts';
import { formatPrice } from '@/lib/utils/currency';
import { startOfMonth, endOfMonth, subMonths, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';
import { ENABLE_TRANSACTION_DATE_FILTER } from '@/constants/featureFlags';

export default function DashboardContent() {
  const { loading, user, region } = useGlobal();
  const t = useTranslations('dashboard');
  const [viewMode, setViewMode] = React.useState<'weekly' | 'monthly'>('weekly');

  // Fetch 90 days to ensure we have enough history for previous months
  const { data: recentReceipts = [] } = useRecentReceipts(user?.id, 90);

  const dailyData = useMemo(() => {
    // Weekly: Rolling 7 Days
    // Monthly: Calendar Month to Date (e.g., Feb 1 to Today)
    const days = viewMode === 'weekly' ? 7 : new Date().getDate();
    const dateMode = ENABLE_TRANSACTION_DATE_FILTER ? 'transaction' : 'created';
    return groupReceiptsByDay(recentReceipts, days, 'en', dateMode);
  }, [recentReceipts, viewMode]);

  const stats = useMemo(() => {
    // 1. Derive main stats directly from dailyData (Chart Data) to ensure 100% consistency
    const totalSpent = dailyData.reduce((sum, day) => sum + day.totalSpent, 0);
    const itemsProcessed = dailyData.reduce((sum, day) => sum + day.count, 0);

    // Find today's stats from dailyData
    const todayData = dailyData.find((d) => d.isToday);
    const newScansToday = todayData ? todayData.count : 0;

    // 2. Calculate Trends
    const now = new Date();

    const getPreviousPeriodReceipts = () => {
      if (viewMode === 'weekly') {
        // Compare vs previous 7 days
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 13); // 14 days ago (7 days current + 7 days prev)
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(now);
        endDate.setDate(now.getDate() - 7); // 7 days ago
        endDate.setHours(23, 59, 59, 999);

        return recentReceipts.filter((r) => {
          const dateStr = r.transaction_date || r.created_at;
          if (!dateStr) return false;
          const rDate = parseISO(dateStr);
          return isAfter(rDate, startDate) && (isBefore(rDate, endDate) || isSameDay(rDate, endDate));
        });
      } else {
        // Compare vs Previous Calendar Month (Full)
        const prevMonthDate = subMonths(now, 1);
        const startDate = startOfMonth(prevMonthDate);
        const endDate = endOfMonth(prevMonthDate);

        return recentReceipts.filter((r) => {
          const dateStr = r.transaction_date || r.created_at;
          if (!dateStr) return false;
          const rDate = parseISO(dateStr);
          return (isAfter(rDate, startDate) || isSameDay(rDate, startDate)) && (isBefore(rDate, endDate) || isSameDay(rDate, endDate));
        });
      }
    };

    const previousReceipts = getPreviousPeriodReceipts();

    const calculateStats = (receipts: typeof recentReceipts) => ({
      totalSpent: receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0),
      count: receipts.length
    });

    const previous = calculateStats(previousReceipts);

    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return null;
      return ((curr - prev) / prev) * 100;
    };

    // Current is statistically equal to what's in dailyData (derived above)
    // but useful to calculate strictly for trend if needed.
    // We already have 'totalSpent' and 'itemsProcessed' for current.

    const spendTrend = calculateTrend(totalSpent, previous.totalSpent);
    const countTrend = calculateTrend(itemsProcessed, previous.count);

    return {
      totalSpent,
      itemsProcessed,
      newScansToday,
      spendTrend,
      countTrend
    };
  }, [recentReceipts, dailyData, viewMode]);

  useEffect(() => {
    createAppUser();
  }, []);

  const createAppUser = async () => {
    const supabase = await createSPASassClient();
    const client = supabase.getSupabaseClient();
    const {
      data: { user: userApp }
    } = await client.auth.getUser();

    if (!userApp) return;
    const { data: existing } = await client.from('users').select('id').eq('id', userApp.id).single();

    if (!existing) {
      await client.from('users').insert({
        id: userApp.id,
        slug: userApp.user_metadata.slug || userApp.id,
        display_name: userApp.user_metadata.full_name || userApp.user_metadata.name || 'User'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Stats Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title={viewMode === 'weekly' ? t('stats.weeklySpend') : t('stats.monthlySpend')}
          value={formatPrice(stats.totalSpent, region)}
          icon={TrendingUp}
          className="shadow-sm"
          trend={stats.spendTrend !== null ? `${stats.spendTrend > 0 ? '+' : ''}${stats.spendTrend.toFixed(1)}%` : undefined}
          subtext={viewMode === 'weekly' ? t('stats.vsLastWeek') : t('stats.vsLastMonth')}
          trendType={stats.spendTrend === null || stats.spendTrend === 0 ? 'neutral' : stats.spendTrend > 0 ? 'positive' : 'negative'}
          data-testid="stat-total-spent"
          subtextTestId={`stat-total-spent-subtext-${viewMode}`}
        />

        <StatCard
          title={viewMode === 'weekly' ? t('stats.weeklySaved') : t('stats.monthlySaved')}
          value={stats.itemsProcessed}
          icon={FileCheck}
          className="shadow-sm"
          trend={stats.countTrend !== null ? `${stats.countTrend > 0 ? '+' : ''}${stats.countTrend.toFixed(1)}%` : undefined}
          subtext={viewMode === 'weekly' ? t('stats.vsLastWeek') : t('stats.vsLastMonth')}
          trendType={stats.countTrend === null || stats.countTrend === 0 ? 'neutral' : stats.countTrend > 0 ? 'positive' : 'negative'}
          data-testid="stat-items-processed"
          subtextTestId={`stat-items-processed-subtext-${viewMode}`}
        />

        <StatCard title={t('stats.recentActivity')} value={`${stats.newScansToday} ${t('stats.newScans')}`} icon={History} className="shadow-sm" subtext={t('stats.today')} data-testid="stat-recent-activity" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2" data-testid="receipt-activity-chart">
          <ReceiptActivityChart data={dailyData} viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
        <div data-testid="category-breakdown-container">
          <CategoryBreakdown data={dailyData} viewMode={viewMode} testId={`category-breakdown-chart-${viewMode}`} />
        </div>
      </div>
    </div>
  );
}
