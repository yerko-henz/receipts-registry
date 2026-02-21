'use client';

import React, { useState, useTransition } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { analyzeReceiptAction } from '@/app/actions/analyze';
import { createReceipt, uploadReceiptImage as uploadImageService } from '@/lib/services/receipts';
import { ReceiptData } from '@/lib/types/receipt';
import { Button } from '@/components/ui/button';
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

export default function AnalyzePage() {
  const { user, loading: globalLoading } = useGlobal();
  const t = useTranslations('dashboard.analyze');
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  // Fetch recently uploaded receipts (fixed list version)
  const { data: recentData } = useReceipts(user?.id, 1, 3);
  const recentReceipts = recentData?.data || [];

  const createMutation = useMutation({
    mutationFn: createReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['recent_receipts'] });
      router.push(`/dashboard/receipts`);
    },
    onError: (err: any) => {
      setError(err.message);
      setIsSaving(false);
    }
  });

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Auto-analyze on select
    handleAnalyze(selectedFile);
  };

  const handleAnalyze = (fileToAnalyze: File) => {
    setError(null);
    const formData = new FormData();
    formData.append('file', fileToAnalyze);

    startTransition(async () => {
      const resp = await analyzeReceiptAction(formData);
      if (resp.error) {
        setError(resp.error);
      } else if (resp.data) {
        setResult(resp.data);
      }
    });
  };

  const handleSave = async () => {
    if (!result || !file) return;
    setIsSaving(true);

    try {
      const publicUrl = await uploadImageService(file);

      await createMutation.mutateAsync({
        merchant_name: result.merchantName,
        total: result.total,
        currency: result.currency,
        date: result.date,
        category: result.category as any,
        tax_amount: result.taxAmount || 0,
        image_url: publicUrl,
        raw_ai_output: result,
        items: result.items
      });
    } catch (err: any) {
      console.error('Save Error', err);
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10 px-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{t('uploadNew')}</h1>
        <p className="text-muted-foreground text-lg">{t('dragDrop')}</p>
      </div>

      {/* Main Uploader / Result area */}
      <div className="space-y-8">
        {!result ? (
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
          <Card className="overflow-hidden border-2 border-primary/20 bg-card shadow-lg animate-in fade-in zoom-in duration-300">
            <CardContent className="p-0">
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between border-b pb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{t('success')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('integrity')}: <span className={result.integrityScore && result.integrityScore > 80 ? 'text-green-600 font-bold' : 'text-yellow-600 font-bold'}>{result.integrityScore}%</span>
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                    {t('label')}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('merchant')}</span>
                    <p className="text-lg font-bold text-foreground">{result.merchantName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('date')}</span>
                    <p className="text-lg font-bold text-foreground">{result.date}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('total')}</span>
                    <p className="text-2xl font-black text-primary">
                      {result.total} {result.currency}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('category')}</span>
                    <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{result.category}</p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">{t('table.item')}</TableHead>
                        <TableHead className="text-right font-bold w-[100px]">{t('table.qty')}</TableHead>
                        <TableHead className="text-right font-bold w-[150px]">{t('table.price')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{item.totalPrice}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button onClick={handleSave} className="w-full h-14 text-lg font-bold shadow-lg" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    t('save')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
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
      {!result && !isPending && (
        <div className="space-y-6 pt-12 border-t">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              {t('recentlyUploaded')}
            </h2>
            <Link href="/dashboard/receipts">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/5">
                View all receipts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {recentReceipts.length > 0 ? (
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
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full">{receipt.category}</span>
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
