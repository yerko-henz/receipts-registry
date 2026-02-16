"use client";

import React, { useState, useEffect } from "react";
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
import { useModal } from "@/lib/context/ModalContext";
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Loader2,
  ExternalLink
} from "lucide-react";
import { RECEIPT_CATEGORIES } from "@/constants/categories";
import { ENABLE_TRANSACTION_DATE_FILTER } from "@/constants/featureFlags";
import { syncReceiptsToSheet, initGoogleAuth } from "@/lib/services/google-sheets";
import Script from "next/script";

// import { toast } from "sonner"; // Removed as not available

export default function ReceiptsPage() {
  const { user, region } = useGlobal();
  const t = useTranslations('dashboard.receipts');
  // We need a translation helper for the sheet logic that might expect different keys
  // or we pass a custom t function.
  const tUserSettings = useTranslations('userSettings');
  
  const tCategories = useTranslations('dashboard.categories');
  
  // State for filters and pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<'transaction' | 'created'>(ENABLE_TRANSACTION_DATE_FILTER ? 'transaction' : 'created');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'desc' });

  // Export State
  const [exporting, setExporting] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const { openModal, closeModal } = useModal();

  // Load Saved Sheet State
  useEffect(() => {
    if (user?.id) {
        const id = localStorage.getItem(`google_sheet_id_${user.id}`);
        const date = localStorage.getItem(`last_export_date_${user.id}`);
        setSheetId(id || null);
        setLastExport(date || null);
    }
  }, [user]);

  // Fetch data
  const { data, isLoading } = useReceipts(user?.id, page, pageSize, {
    searchQuery: searchQuery,
    category: categoryFilter,
    dateMode: dateMode,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy: sortConfig.key || undefined,
    sortOrder: sortConfig.direction,
  });

  const receipts = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const hasUnsyncedChanges = React.useMemo(() => {
    if (receipts.length === 0) return false;
    if (!lastExport) return true; 
    return receipts.some(r => r.created_at > lastExport);
  }, [receipts, lastExport]);

  // Helper for category translations
  const categoryLabels = React.useMemo(() => {
    return RECEIPT_CATEGORIES.reduce((acc, cat) => {
      const lowerCat = cat.toLowerCase();
      if (['food', 'transport', 'utilities', 'entertainment', 'shopping', 'health', 'other'].includes(lowerCat)) {
        acc[cat] = tCategories(lowerCat as any);
      } else {
        acc[cat] = cat;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [tCategories]);

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

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleExport = async () => {
    if (receipts.length === 0) {
      alert(t('noReceiptsToExport') || 'No receipts to export');
      return;
    }

    try {
        setExporting(true);
        // Translation wrapper for the service
        const tWrapper = (key: string) => {
             if (key === 'receipts.title') return tUserSettings('googleSheets.fileTitle') || 'Receipts';
             if (key === 'receipts.receiptDate') return 'Date';
             if (key === 'receipts.merchant') return 'Merchant';
             if (key === 'receipts.total') return 'Total';
             if (key === 'receipts.link') return 'Standard Link'; 
             if (key === 'receipts.id') return 'ID';
             return key;
        };

        // Note: This only exports the current PAGE of receipts because `receipts` is paginated.
        // The mobile app exports `receipts` which seems to be the loaded list.
        // Ideally we should fetch ALL, but for now we follow the mobile pattern or the current data.
        // User might expect to export what they see, or everything filtered.
        const result = await syncReceiptsToSheet(receipts, lastExport, tWrapper);
        
        if (user?.id) {
            localStorage.setItem(`google_sheet_id_${user.id}`, result.spreadsheetId);
            localStorage.setItem(`last_export_date_${user.id}`, result.timestamp);
        }
        
        setSheetId(result.spreadsheetId);
        setLastExport(result.timestamp);

        if (result.syncedCount === 0) {
            openModal({
                title: t('alreadySyncedTitle') || 'Already Synced',
                description: t('alreadySynced') || 'All receipts are already synced!',
                actions: [{ label: 'OK', onClick: closeModal, variant: 'default' }]
            });
        } else {
             openModal({
                title: t('exportSuccess') || 'Export Successful',
                description: t('exportSuccessMessage') || 'Your receipts have been successfully exported to Google Sheets.',
                actions: [
                    { label: t('close') || 'Close', onClick: closeModal, variant: 'outline' },
                    { 
                        label: t('openSheet') || 'Open Sheet', 
                        onClick: () => {
                            window.open(result.url, '_blank');
                            closeModal();
                        },
                        variant: 'default'
                    }
                ]
             });
        }

    } catch (error: any) {
        console.error(error);
        alert(error.message || 'Failed to export to Google Sheets');
    } finally {
        setExporting(false);
    }
  };

  const RenderSortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />;
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="space-y-6 p-6">
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={() => initGoogleAuth()}
      />
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="receipts-title">{t('title')}</h1>
            <p className="text-muted-foreground">
            {t('subtitle')}
            </p>
        </div>
        <div className="flex items-center gap-2">
            {sheetId && !hasUnsyncedChanges && !isLoading && (
                 <Button 
                    variant="outline" 
                    size="sm"
                    className="hidden sm:flex"
                    onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank')}
                 >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('openSheet') || 'Open Sheet'}
                 </Button>
            )}
            
            {sheetId && hasUnsyncedChanges && (
                <Button 
                    onClick={handleExport} 
                    disabled={exporting || receipts.length === 0}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    {exporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <img 
                            src="https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png" 
                            alt="Google Sheets" 
                            className="mr-2 h-4 w-4"
                        />
                    )}
                    {t('exportToSheets') || 'Export to Sheets'}
                </Button>
            )}
        </div>
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
              data-testid="search-input"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
               {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="category-filter">
                  <SelectValue placeholder={t('filters.category')}>
                    {categoryFilter === 'All' 
                      ? t('filters.allCategories') 
                      : (categoryLabels[categoryFilter] || categoryFilter)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All" data-testid="category-option-all">{t('filters.allCategories')}</SelectItem>
                  {RECEIPT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} data-testid={`category-option-${cat.toLowerCase()}`}>
                        {categoryLabels[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

               {/* Date Mode Filter - Only show if enabled */}
               {ENABLE_TRANSACTION_DATE_FILTER && (
                 <Select value={dateMode} onValueChange={(v) => setDateMode(v as 'transaction' | 'created')}>
                  <SelectTrigger className="w-[150px]" data-testid="date-mode-filter">
                    <SelectValue placeholder={t('filters.dateType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transaction">{t('filters.receiptDate')}</SelectItem>
                    <SelectItem value="created">{t('filters.uploadDate')}</SelectItem>
                  </SelectContent>
                </Select>
               )}
            
               {/* Date Range Filter */}
               <div data-testid="date-range-filter">
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
        </div>
        
        {/* Table Section */}
        <div className="border-t">
            <Table data-testid="receipts-table">
                <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead 
                        className="w-[150px] font-semibold text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort(ENABLE_TRANSACTION_DATE_FILTER && dateMode === 'transaction' ? 'transaction_date' : 'created_at')}
                        data-testid="header-date"
                    >
                        <div className="flex items-center">
                            {ENABLE_TRANSACTION_DATE_FILTER 
                                ? (dateMode === 'transaction' ? t('table.receiptDate') : t('table.uploadDate'))
                                : t('table.date')}
                            <RenderSortIcon columnKey={ENABLE_TRANSACTION_DATE_FILTER && dateMode === 'transaction' ? 'transaction_date' : 'created_at'} />
                        </div>
                    </TableHead>
                    <TableHead 
                        className="font-semibold text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('merchant_name')}
                        data-testid="header-merchant"
                    >
                        <div className="flex items-center">
                            {t('table.merchant')}
                            <RenderSortIcon columnKey="merchant_name" />
                        </div>
                    </TableHead>
                    <TableHead 
                        className="font-semibold text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('category')}
                        data-testid="header-category"
                    >
                         <div className="flex items-center">
                            {t('table.category')}
                            <RenderSortIcon columnKey="category" />
                        </div>
                    </TableHead>
                    <TableHead 
                        className="text-right font-semibold text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('total_amount')}
                        data-testid="header-amount"
                    >
                        <div className="flex items-center justify-end">
                            {t('table.amount')}
                            <RenderSortIcon columnKey="total_amount" />
                        </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground w-[100px]">{t('table.action')}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading || !user ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            {t('table.loading')}
                        </TableCell>
                    </TableRow>
                ) : receipts.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground" data-testid="empty-state">
                            {t('table.empty')}
                        </TableCell>
                    </TableRow>
                ) : (
                    receipts.map((receipt: Receipt) => {
                        const dateToDisplay = ENABLE_TRANSACTION_DATE_FILTER && dateMode === 'transaction'
                            ? (receipt.transaction_date || receipt.created_at) // Fallback if transaction date missing
                            : receipt.created_at;

                        // Normalize category to title case for lookup if needed, but RECEIPT_CATEGORIES are Title Case
                        // And receipt.category might be anything. 
                        // Let's try to match case-insensitively to our known categories
                        const knownCategory = RECEIPT_CATEGORIES.find(c => c.toLowerCase() === (receipt.category || '').toLowerCase());
                        const displayCategory = knownCategory ? categoryLabels[knownCategory] : (receipt.category || 'Uncategorized');

                        return (
                        <TableRow key={receipt.id} className="hover:bg-muted/50" data-testid={`receipt-row-${receipt.id}`}>
                            <TableCell className="text-muted-foreground font-medium">
                                {format(new Date(dateToDisplay), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                                <span className="font-semibold text-foreground" data-testid={`merchant-${receipt.id}`}>{receipt.merchant_name}</span>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className={`${getCategoryColor(receipt.category || 'Other')} border-none px-2 py-0.5`}>
                                    {displayCategory}
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
        {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t bg-muted/5" data-testid="receipts-pagination">
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
        )}
      </Card>


    </div>
  );
}
