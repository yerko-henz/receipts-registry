"use client";

import React, { useState } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { useReceipts } from "@/lib/hooks/useReceipts";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt } from "@/lib/services/receipts";
import { formatPrice } from "@/lib/utils/currency";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
} from "lucide-react";
import { RECEIPT_CATEGORIES } from "@/constants/categories";
import { ENABLE_TRANSACTION_DATE_FILTER } from "@/constants/featureFlags";

export default function ReceiptsPage() {
  const { user, region } = useGlobal();
  const t = useTranslations('dashboard.receipts');
  const tCategories = useTranslations('dashboard.categories');
  
  // State for filters and pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<'transaction' | 'created'>('transaction');

  // Fetch data
  const { data, isLoading } = useReceipts(user?.id, page, pageSize, {
    searchQuery: searchQuery,
    category: categoryFilter,
    dateMode: dateMode,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const receipts = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Helper for category badge colors
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'dining': return "bg-orange-100 text-orange-700 hover:bg-orange-100";
      case 'transport': return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case 'shopping': return "bg-purple-100 text-purple-700 hover:bg-purple-100";
      case 'groceries': return "bg-green-100 text-green-700 hover:bg-green-100";
      case 'entertainment': return "bg-red-100 text-red-700 hover:bg-red-100";
      case 'gas': return "bg-gray-100 text-gray-700 hover:bg-gray-100";
      case 'utilities': return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      case 'health': return "bg-teal-100 text-teal-700 hover:bg-teal-100";
      default: return "bg-muted text-muted-foreground hover:bg-muted";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Card className="border shadow-sm">
        {/* Filter Bar */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
               {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('filters.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('filters.allCategories')}</SelectItem>
                  {RECEIPT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                        {/* Try to translate category, fallback to original if key missing */}
                        {['food', 'transport', 'utilities', 'entertainment', 'shopping', 'health', 'other'].includes(cat.toLowerCase()) 
                            ? tCategories(cat.toLowerCase() as any) 
                            : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

               {/* Date Mode Filter - Only show if enabled */}
               {ENABLE_TRANSACTION_DATE_FILTER && (
                 <Select value={dateMode} onValueChange={(v) => setDateMode(v as 'transaction' | 'created')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('filters.dateType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transaction">{t('filters.receiptDate')}</SelectItem>
                    <SelectItem value="created">{t('filters.uploadDate')}</SelectItem>
                  </SelectContent>
                </Select>
               )}
            
               {/* Date Range Filter */}
               <DateRangeFilter 
                    startDate={startDate} 
                    endDate={endDate}
                    onRangeChange={(start, end) => {
                        setStartDate(start);
                        setEndDate(end);
                    }}
               />
            </div>
          </div>
        </div>
        
        {/* Table Section */}
        <div className="border-t">
            <Table>
                <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead className="w-[150px] font-semibold text-foreground">
                        {ENABLE_TRANSACTION_DATE_FILTER 
                            ? (dateMode === 'transaction' ? t('table.receiptDate') : t('table.uploadDate'))
                            : t('table.date')}
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">{t('table.merchant')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('table.category')}</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">{t('table.amount')}</TableHead>
                    <TableHead className="text-right font-semibold text-foreground w-[100px]">{t('table.action')}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            {t('table.loading')}
                        </TableCell>
                    </TableRow>
                ) : receipts.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            {t('table.empty')}
                        </TableCell>
                    </TableRow>
                ) : (
                    receipts.map((receipt: Receipt) => {
                        const dateToDisplay = ENABLE_TRANSACTION_DATE_FILTER && dateMode === 'transaction'
                            ? (receipt.transaction_date || receipt.created_at) // Fallback if transaction date missing
                            : receipt.created_at;

                        return (
                        <TableRow key={receipt.id} className="hover:bg-muted/50">
                            <TableCell className="text-muted-foreground font-medium">
                                {format(new Date(dateToDisplay), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                                <span className="font-semibold text-foreground">{receipt.merchant_name}</span>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className={`${getCategoryColor(receipt.category || 'Other')} border-none px-2 py-0.5`}>
                                    {['food', 'transport', 'utilities', 'entertainment', 'shopping', 'health', 'other'].includes((receipt.category || '').toLowerCase())
                                        ? tCategories((receipt.category || 'Other').toLowerCase() as any)
                                        : (receipt.category || 'Uncategorized')}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-base">
                                 {formatPrice(receipt.total_amount || 0, region, receipt.currency)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" className="h-8 text-primary font-medium hover:text-primary/80">
                                    {t('table.view')}
                                </Button>
                            </TableCell>
                        </TableRow>
                        );
                    })
                )}
                </TableBody>
            </Table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/5">
             <div className="text-sm text-muted-foreground">
                 {t('pagination.showing', { 
                    start: Math.min((page - 1) * pageSize + 1, totalCount), 
                    end: Math.min(page * pageSize, totalCount), 
                    total: totalCount 
                 })}
             </div>
             <div className="flex items-center space-x-2">
                 <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                 >
                     <ChevronLeft className="h-4 w-4" />
                 </Button>
                 
                 <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                            <Button
                                key={pageNum}
                                variant={page === pageNum ? "default" : "outline"}
                                className={`h-8 w-8 p-0 ${page === pageNum ? "bg-primary text-primary-foreground" : ""}`}
                                onClick={() => setPage(pageNum)}
                            >
                                {pageNum}
                            </Button>
                        );
                    })}
                    {totalPages > 5 && <span className="px-2 text-muted-foreground">...</span>}
                 </div>

                 <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                 >
                     <ChevronRight className="h-4 w-4" />
                 </Button>
             </div>
        </div>
      </Card>
    </div>
  );
}
