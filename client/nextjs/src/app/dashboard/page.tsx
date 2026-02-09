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
import { groupReceiptsByDay } from "@/lib/date";
import { useRecentReceipts } from "@/lib/hooks/useReceipts";
import { formatPrice } from "@/lib/utils/currency";

export default function DashboardContent() {
  const { loading, user, region } = useGlobal();
  const t = useTranslations("dashboard");
  const [viewMode, setViewMode] = React.useState<'weekly' | 'monthly'>('weekly');
  
  const daysToFetch = viewMode === 'weekly' ? 7 : 30;
  const { data: recentReceipts = [] } = useRecentReceipts(user?.id, daysToFetch);
  
  const dailyData = useMemo(() => {
      // Assuming 'en' for now, ideally strictly from locale
      return groupReceiptsByDay(recentReceipts, daysToFetch, 'en');
  }, [recentReceipts, daysToFetch]);
  
  const stats = useMemo(() => {
      const totalSpent = recentReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const itemsProcessed = recentReceipts.length;
      
      // Calculate today's stats
      const today = new Date().toISOString().split('T')[0];
      const todayReceipts = recentReceipts.filter(r => r.created_at.startsWith(today));
      const newScansToday = todayReceipts.length;

      return {
          totalSpent,
          itemsProcessed,
          newScansToday
      };
  }, [recentReceipts]);

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
          trend="0%" // Todo: Calculate vs previous period
          subtext={viewMode === 'weekly' ? t('stats.vsLastWeek') : t('stats.vsLastMonth')}
          trendType="neutral"
        />

        <StatCard
          title={t('stats.saved')}
          value={stats.itemsProcessed}
          icon={FileCheck}
          className="shadow-sm"
          trend="0%" // Todo: Calculate vs previous period
          subtext={viewMode === 'weekly' ? t('stats.vsLastWeek') : t('stats.vsLastMonth')}
          trendType="neutral"
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
