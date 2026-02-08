"use client";
import React, { useMemo, useEffect } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import {
  DollarSign,
  FileCheck,
  History,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createSPASassClientAuthenticated as createSPASassClient } from "@/lib/supabase/client";
import ReceiptActivityChart from "@/components/dashboard/ReceiptActivityChart";
import CategoryBreakdown from "@/components/dashboard/CategoryBreakdown";
import StatCard from "@/components/dashboard/StatCard";
import { DayData } from "@/lib/date";
import { subDays, format } from "date-fns";
import { formatPrice } from "@/lib/utils/currency";

// --- DUMMY DATA GENERATOR ---
const generateDummyData = (): DayData[] => {
  const categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];
  const days = 30; // Generate 30 days to support monthly view
  const data: DayData[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
     const date = subDays(now, i);
     const dateKey = format(date, 'yyyy-MM-dd');
     const dayName = format(date, 'EEE');
     
     // Random daily count between 5 and 25
     const count = Math.floor(Math.random() * 20) + 5;
     
     // Generate dummy receipts for categories
     const receipts = Array.from({ length: count }).map((_, idx) => ({
        id: `${dateKey}-${idx}`,
        created_at: date.toISOString(),
        transaction_date: date.toISOString(),
        merchant_name: `Store ${idx}`,
        total_amount: Math.random() * 50 + 10, // Random amount 10-60
        currency: 'USD',
        category: categories[Math.floor(Math.random() * categories.length)],
        user_id: 'dummy',
     }));

     const totalSpent = receipts.reduce((sum, r) => sum + r.total_amount, 0);

     data.push({
         dateKey,
         dayName,
         receipts,
         totalSpent,
         count,
         isToday: i === 0
     });
  }
  return data;
};

const DUMMY_DATA = generateDummyData();

export default function DashboardContent() {
  const { loading, user, region } = useGlobal();
  const t = useTranslations("dashboard");
  const [viewMode, setViewMode] = React.useState<'weekly' | 'monthly'>('weekly');
  
  // Use Dummy Data instead of real hooks
  // const { data: recentReceipts = [] } = useRecentReceipts(user?.id, 30);
  
  const stats = {
      totalSpent: 1245.50,
      itemsProcessedToday: 42,
      newScansToday: 12
  };

  const dailyData = DUMMY_DATA;
  
  const totalReceiptsCount = useMemo(() => {
    return dailyData.reduce((sum, day) => sum + day.count, 0);
  }, [dailyData]);

  useEffect(() => {
    createAppUser();
  }, []);

  const createAppUser = async () => {
    const supabase = await createSPASassClient();
    const client = supabase.getSupabaseClient();
    const {
      data: { user: userApp },
    } = await client.auth.getUser();

    if (!userApp) return;
    const { data: existing } = await client
      .from("users")
      .select("id")
      .eq("id", userApp.id)
      .single();

    if (!existing) {
      await client.from("users").insert({
        id: userApp.id,
        slug: userApp.user_metadata.slug || userApp.id, // Fallback if slug missing
        display_name: userApp.user_metadata.slug || 'User',
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
          title={t('stats.totalSpent')}
          value={formatPrice(stats.totalSpent, region)}
          icon={TrendingUp}
          className="shadow-sm"
          trend="5.2%"
          subtext={viewMode === 'weekly' ? t('stats.vsLastWeek') : t('stats.vsLastMonth')}
          trendType="positive"
        />

        <StatCard
          title={t('stats.saved')}
          value={totalReceiptsCount}
          icon={FileCheck}
          className="shadow-sm"
          trend="12%"
          subtext={viewMode === 'weekly' ? t('stats.vsLastWeek') : t('stats.vsLastMonth')}
          trendType="positive"
        />

        <StatCard
          title={t('stats.recentActivity')}
          value={`${stats.newScansToday} ${t('stats.newScans')}`}
          icon={History}
          className="shadow-sm"
          subtext={t('stats.today')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
           <div className="lg:col-span-2">
               <ReceiptActivityChart 
                  data={dailyData} 
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
               />
           </div>
           <div>
               <CategoryBreakdown data={dailyData} viewMode={viewMode} />
           </div>
      </div>
    </div>
  );
}
