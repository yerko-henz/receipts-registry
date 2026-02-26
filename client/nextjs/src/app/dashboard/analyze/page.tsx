'use client';

import React, { useState, useTransition } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { analyzeReceiptAction } from '@/app/actions/analyze';
import { createReceipt, uploadReceiptImage as uploadImageService } from '@/lib/services/receipts';
import { ReceiptData } from '@/lib/types/receipt';
import { RECEIPT_CATEGORIES, ReceiptCategory, CATEGORY_COLORS } from '@/constants/categories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileUploader } from '@/components/FileUploader';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'error';

interface FileAnalysis {
  file: File;
  status: AnalysisStatus;
  result?: ReceiptData;
  error?: string;
}

function isValidCategory(category: string): category is ReceiptCategory {
  return RECEIPT_CATEGORIES.includes(category as ReceiptCategory);
}

export default function AnalyzePage() {
  const { user } = useGlobal();
  const t = useTranslations('dashboard.analyze');
  const tCategories = useTranslations('dashboard');
  const router = useRouter();

  const [analyses, setAnalyses] = useState<FileAnalysis[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  // Fetch recently uploaded receipts
  const recentDataQuery = useReceipts(user?.id, 1, 3);
  const recentReceipts = recentDataQuery.data?.data || [];

  const createMutation = useMutation({
    mutationFn: createReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['recent_receipts'] });
      router.push(`/dashboard/receipts`);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save receipt');
      }
      setIsSaving(false);
    }
  });

  const handleFileSelect = (selectedFiles: File[]) => {
    setError(null);

    // Initialize analyses for each file
    const newAnalyses: FileAnalysis[] = selectedFiles.map((file) => ({
      file,
      status: 'pending'
    }));
    setAnalyses(newAnalyses);

    // Auto-analyze all files
    selectedFiles.forEach((file, index) => {
      analyzeFile(file, index);
    });
  };

  const analyzeFile = (fileToAnalyze: File, index: number) => {
    // Update status to processing
    setAnalyses((prev) => prev.map((analysis, i) => (i === index ? { ...analysis, status: 'processing' } : analysis)));

    const formData = new FormData();
    formData.append('file', fileToAnalyze);

    startTransition(async () => {
      try {
        const resp = await analyzeReceiptAction(formData);
        if (resp.error) {
          setAnalyses((prev) => prev.map((analysis, i) => (i === index ? { ...analysis, status: 'error', error: resp.error } : analysis)));
        } else if (resp.data) {
          setAnalyses((prev) => prev.map((analysis, i) => (i === index ? { ...analysis, status: 'completed', result: resp.data } : analysis)));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setAnalyses((prev) => prev.map((analysis, i) => (i === index ? { ...analysis, status: 'error', error: message } : analysis)));
      }
    });
  };

  const handleSave = async (index: number) => {
    const analysis = analyses[index];
    if (!analysis.result || !analysis.file) return;
    setIsSaving(true);

    try {
      const publicUrl = await uploadImageService(analysis.file);

      // Ensure category is valid
      const category = isValidCategory(analysis.result.category || '') ? (analysis.result.category as ReceiptCategory) : 'Other';

      await createMutation.mutateAsync({
        merchant_name: analysis.result.merchantName,
        total: analysis.result.total,
        currency: analysis.result.currency,
        date: analysis.result.date,
        category,
        tax_amount: analysis.result.taxAmount ?? 0,
        image_url: publicUrl,
        raw_ai_output: analysis.result,
        items: analysis.result.items
      });

      // Remove saved file from the list
      setAnalyses((prev) => prev.filter((_, i) => i !== index));
    } catch (err: unknown) {
      console.error('Save Error', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save receipt');
      }
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const completedAnalyses = analyses.filter((a) => a.status === 'completed' && a.result);
    if (completedAnalyses.length === 0) return;

    setIsSaving(true);

    try {
      // Save all completed receipts one by one
      for (const analysis of completedAnalyses) {
        if (!analysis.result || !analysis.file) continue;

        const publicUrl = await uploadImageService(analysis.file);

        // Ensure category is valid
        const category = isValidCategory(analysis.result.category || '') ? (analysis.result.category as ReceiptCategory) : 'Other';

        await createMutation.mutateAsync({
          merchant_name: analysis.result.merchantName,
          total: analysis.result.total,
          currency: analysis.result.currency,
          date: analysis.result.date,
          category,
          tax_amount: analysis.result.taxAmount ?? 0,
          image_url: publicUrl,
          raw_ai_output: analysis.result,
          items: analysis.result.items
        });
      }

      // Clear all after successful batch save
      setAnalyses([]);
    } catch (err: unknown) {
      console.error('Batch Save Error', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save receipts');
      }
      setIsSaving(false);
    }
  };

  const handleRetry = (index: number) => {
    if (analyses[index]) {
      analyzeFile(analyses[index].file, index);
    }
  };

  const hasCompleted = analyses.some((a) => a.status === 'completed');

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10 px-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{t('uploadNew')}</h1>
        <p className="text-muted-foreground text-lg">{t('dragDrop')}</p>
      </div>

      {/* Main Uploader / Results area */}
      <div className="space-y-8">
        {analyses.length === 0 ? (
          <FileUploader
            onFileSelect={handleFileSelect}
            isLoading={isPending}
            disabled={isSaving}
            translations={{
              dropFiles: t('dropFiles'),
              supportedFormats: t('supportedFormats'),
              browseFiles: t('browseFiles')
            }}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{t('analysisResults')}</h2>
                <p className="text-sm text-muted-foreground">
                  {analyses.filter((a) => a.status === 'completed').length} of {analyses.length} completed
                </p>
              </div>
              {hasCompleted && (
                <Button onClick={handleSaveAll} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save All ({analyses.filter((a) => a.status === 'completed').length})</>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {analyses.map((analysis, index) => (
                <Card key={index} className="overflow-hidden border">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {analysis.status === 'pending' && <Clock className="h-5 w-5 text-muted-foreground" />}
                          {analysis.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                          {analysis.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {analysis.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}

                          <div>
                            <h3 className="font-semibold text-foreground">{analysis.file.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {analysis.status === 'pending' && 'Waiting to analyze...'}
                              {analysis.status === 'processing' && 'Analyzing...'}
                              {analysis.status === 'completed' && `${analysis.result?.merchantName} - ${analysis.result?.total} ${analysis.result?.currency}`}
                              {analysis.status === 'error' && analysis.error}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {analysis.status === 'completed' && (
                            <Button onClick={() => handleSave(index)} disabled={isSaving} size="sm">
                              Save
                            </Button>
                          )}
                          {analysis.status === 'error' && (
                            <Button onClick={() => handleRetry(index)} size="sm" variant="outline">
                              Retry
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setAnalyses((prev) => prev.filter((_, i) => i !== index))}>
                            Remove
                          </Button>
                        </div>
                      </div>

                      {analysis.status === 'completed' && analysis.result && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('merchant')}</span>
                              <p className="font-medium">{analysis.result.merchantName}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('date')}</span>
                              <p className="font-medium">{analysis.result.date}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('total')}</span>
                              <p className="font-bold text-primary">
                                {analysis.result.total.toFixed(2)} {analysis.result.currency}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('category')}</span>
                              <p className="font-medium">{analysis.result.category}</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <h4 className="text-sm font-semibold mb-2">{t('table.items')}</h4>
                            <div className="rounded-lg border bg-muted/30 overflow-hidden max-h-48 overflow-y-auto">
                              <Table>
                                <TableHeader className="bg-muted/50">
                                  <TableRow>
                                    <TableHead className="font-bold text-xs">{t('table.item')}</TableHead>
                                    <TableHead className="text-right font-bold text-xs w-[80px]">{t('table.qty')}</TableHead>
                                    <TableHead className="text-right font-bold text-xs w-[120px]">{t('table.price')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {analysis.result.items.map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell className="text-sm font-medium">{item.name}</TableCell>
                                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                                      <TableCell className="text-right font-mono text-sm font-bold">{item.totalPrice.toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-3 border border-destructive/20 animate-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* Recently Uploaded Section */}
      {analyses.length === 0 && (
        <div className="space-y-6 pt-12 border-t">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              {t('recentlyUploaded')}
            </h2>
            <Link href="/dashboard/receipts">
              <Button variant="outline" size="sm" className="hover:bg-primary/5">
                {t('viewAll')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {recentDataQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16 rounded-full" />
                  </div>
                </div>
              ))
            ) : recentReceipts.length > 0 ? (
              recentReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{receipt.merchant_name[0]}</div>
                    <div>
                      <h4 className="font-bold text-foreground">{receipt.merchant_name}</h4>
                      <p className="text-xs text-muted-foreground">{receipt.transaction_date ? format(new Date(receipt.transaction_date), 'PPP') : format(new Date(receipt.created_at), 'PPP')}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-bold text-foreground">
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: receipt.currency || 'CLP'
                      }).format(receipt.total_amount || 0)}
                    </span>
                    {(() => {
                      const categoryKey = receipt.category as ReceiptCategory;
                      const categoryColor = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.Other;
                      const categoryName = tCategories(`categories.${receipt.category.toLowerCase()}`, { defaultValue: receipt.category });
                      return (
                        <Badge
                          variant="secondary"
                          className="border-none px-2 py-0.5"
                          style={{
                            backgroundColor: `${categoryColor}20`,
                            color: categoryColor
                          }}
                        >
                          {categoryName}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 rounded-xl border-2 border-dashed border-muted bg-muted/20">
                <p className="text-muted-foreground">{t('table.empty')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
