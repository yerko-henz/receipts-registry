"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, TooltipProps } from "recharts";
import { DayData } from "@/lib/date";
import { useTranslations } from 'next-intl';
import DayDetailsModal from './DayDetailsModal';
import { Receipt } from '@/lib/services/receipts';
import { formatPrice } from "@/lib/utils/currency";
import { useGlobal } from "@/lib/context/GlobalContext";

interface Props {
  data: DayData[];
  viewMode: 'weekly' | 'monthly';
  onViewModeChange: (mode: 'weekly' | 'monthly') => void;
}

// Custom Tooltip component can't easily use hook unless we pass t or use Context inside (if inside provider)
// Since it's a sub-component defined outside, let's move it inside or pass t
const CustomTooltip = ({ active, payload, label, t, region }: TooltipProps<number, string> & { t: any, region: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover p-2 border rounded-md shadow-md text-sm text-popover-foreground">
        <p className="font-semibold">{label}</p>
        <p className="text-muted-foreground">{t('charts.totalSaved')}: {formatPrice(payload[0].value as number, region)}</p>
        <p className="text-muted-foreground/70 text-xs mt-1">{t('charts.tooltipClick')}</p>
      </div>
    );
  }
  return null;
};

export default function ReceiptActivityChart({ data, viewMode, onViewModeChange }: Props) {
  const { region } = useGlobal();
  const t = useTranslations('dashboard');
  const [selectedDay, setSelectedDay] = useState<{ date: string; receipts: Receipt[] } | null>(null);

  // Filter data based on view mode
  const displayData = useMemo(() => {
    if (viewMode === 'weekly') {
      return data.slice(-7); // Last 7 days
    }
    return data; // Show all (30 days)
  }, [data, viewMode]);

  // Prepare data for recharts
  const chartData = useMemo(() => {
    return displayData.map(d => ({
      name: t(`days.${d.dayName.toLowerCase()}`),
      originalName: d.dayName,
      count: d.count,
      totalSpent: d.totalSpent,
      dateKey: d.dateKey,
      receipts: d.receipts
    })); 
  }, [displayData, t]);

  const totalCount = useMemo(() => {
    return data.reduce((sum, day) => sum + day.count, 0);
  }, [data]);

  const handleBarClick = (data: any) => {
      if (data && data.activePayload && data.activePayload.length > 0) {
          const payload = data.activePayload[0].payload;
          setSelectedDay({
              date: payload.dateKey,
              receipts: payload.receipts
          });
      }
  };

  return (
    <>
        <Card className="col-span-1 border-border shadow-sm h-full">
            <CardHeader className="pb-6 mb-[10px] flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">
                    {viewMode === 'weekly' ? t('charts.weeklyActivity') : t('charts.monthlyActivity')}
                    </CardTitle>
                </div>
                <div className="flex bg-muted rounded-lg p-1">
                    <button
                        onClick={() => onViewModeChange('weekly')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'weekly' 
                                ? 'bg-background text-foreground shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {t('charts.weekly')}
                    </button>
                    <button
                        onClick={() => onViewModeChange('monthly')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'monthly' 
                                ? 'bg-background text-foreground shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {t('charts.monthly')}
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                            data={chartData} 
                            onClick={handleBarClick}
                            className="cursor-pointer"
                        >
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                tick={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => formatPrice(value, region)}
                                allowDecimals={false}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip t={t} region={region} />} cursor={{stroke: '#3b82f6', strokeWidth: 1}} />
                            <Line
                                type="monotone"
                                dataKey="totalSpent"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        {selectedDay && (
            <DayDetailsModal 
                isOpen={!!selectedDay}
                onClose={() => setSelectedDay(null)}
                date={selectedDay.date}
                receipts={selectedDay.receipts}
            />
        )}
    </>
  );
}
