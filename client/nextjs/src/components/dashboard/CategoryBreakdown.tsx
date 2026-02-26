'use client';

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DayData } from '@/lib/date';
import { getCategoryIcon, CATEGORY_COLORS, ReceiptCategory, RECEIPT_CATEGORIES } from '@/constants/categories';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface Props {
  data: DayData[];
  viewMode?: 'weekly' | 'monthly';
  testId?: string;
}

export default function CategoryBreakdown({ data, viewMode = 'weekly', testId }: Props) {
  const t = useTranslations('dashboard');

  const categoryData = useMemo(() => {
    // Filter data based on view mode
    const periodData = viewMode === 'weekly' ? data.slice(-7) : data;

    const filtered = periodData.flatMap((d) => d.receipts);
    const totalPeriodSpent = filtered.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const groups: Record<string, number> = {};

    filtered.forEach((r) => {
      const cat = r.category || 'Other';
      groups[cat] = (groups[cat] || 0) + (r.total_amount || 0);
    });

    const dataGroups = Object.keys(groups).map((cat) => {
      const amount = groups[cat];
      const percentage = totalPeriodSpent > 0 ? (amount / totalPeriodSpent) * 100 : 0;
      return {
        category: cat,
        amount,
        percentage
      };
    });

    return {
      total: totalPeriodSpent,
      categories: dataGroups.sort((a, b) => b.amount - a.amount).slice(0, 5) // Limit to top 5
    };
  }, [data]);

  if (categoryData.categories.length === 0) {
    // Return empty state or null, but for layout consistency maybe an empty card?
    // For now null as per original
    return (
      <Card className="col-span-1 border-none shadow-sm h-full" data-testid={testId}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">{viewMode === 'weekly' ? t('charts.weeklyBreakdown') : t('charts.monthlyBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{viewMode === 'weekly' ? t('charts.noDataWeekly') : t('charts.noDataMonthly')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 border-border shadow-sm h-full" data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold">{viewMode === 'weekly' ? t('charts.weeklyBreakdown') : t('charts.monthlyBreakdown')}</CardTitle>
        <Link href="/dashboard/receipts" className="text-sm text-primary-600 hover:underline">
          {t('charts.viewAll')}
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categoryData.categories.map((item) => {
            const Icon = getCategoryIcon(item.category);
            return (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm text-gray-700">{t(`categories.${item.category.toLowerCase()}`)}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.percentage.toFixed(0)}%</span>
                </div>
                {/* Progress bar with custom color matching category or just blue/primary */}
                <Progress
                  value={item.percentage}
                  className="h-1.5 bg-gray-100"
                  indicatorClassName="transition-all"
                  style={{
                    // @ts-expect-error - indicatorStyle is custom for our Progress component
                    indicatorStyle: {
                      backgroundColor: CATEGORY_COLORS[(RECEIPT_CATEGORIES.find((c) => c.toLowerCase() === item.category.toLowerCase()) || 'Other') as ReceiptCategory]
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
