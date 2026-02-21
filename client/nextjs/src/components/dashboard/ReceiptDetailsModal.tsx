import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, parseISO } from 'date-fns';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/utils/currency';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Receipt } from '@/lib/services/receipts';
import { getCategoryIcon } from '@/constants/categories';
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, X, ImageOff } from 'lucide-react'; 
import { useDeleteReceipt } from '@/lib/hooks/useReceipts';
import { useModal } from '@/lib/context/ModalContext';

interface ReceiptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
}

export default function ReceiptDetailsModal({
  isOpen,
  onClose,
  receipt,
}: ReceiptDetailsModalProps) {
  const { region } = useGlobal();
  const t = useTranslations('dashboard.receipts');
  const tCommon = useTranslations('common');
  const tCategories = useTranslations('dashboard.categories');
  const [imageLoading, setImageLoading] = useState(true);
  const deleteMutation = useDeleteReceipt();
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    if (isOpen) {
        setImageLoading(true);
    }
  }, [isOpen, receipt]);

  if (!receipt) return null;

  const Icon = getCategoryIcon(receipt.category || 'Other');
  const dateToDisplay = receipt.transaction_date || receipt.created_at;
  const formattedDate = dateToDisplay ? format(parseISO(dateToDisplay), "MMMM d, yyyy") : 'N/A';

  const handleDelete = () => {
      openModal({
        title: t('deleteConfirmTitle'),
        description: t('deleteConfirmDescription'),
        actions: [
            { label: tCommon('cancel'), onClick: closeModal, variant: 'outline' },
            { 
                label: t('delete'), 
                onClick: () => {
                    closeModal(); // Close confirmation
                    deleteMutation.mutate(receipt.id, {
                        onSuccess: () => {
                             onClose(); // Close details modal
                        },
                        onError: () => {
                             alert(t('deleteError'));
                        }
                    });
                }, 
                variant: 'destructive' 
            }
        ]
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <button 
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50"
        >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
        </button>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row gap-6 p-6">
            {/* Left Column: Image */}
            <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg min-h-[300px] relative overflow-hidden group">
                 {imageLoading && receipt.image_url && (
                     <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                 )}
                 {receipt.image_url ? (
                     /* eslint-disable-next-line @next/next/no-img-element */
                     <img 
                        src={receipt.image_url} 
                        alt="Receipt" 
                        className={`w-full h-full object-contain max-h-[600px] transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                     />
                 ) : (
                     <div className="flex flex-col items-center justify-center p-8 text-muted-foreground space-y-2">
                        <ImageOff className="h-12 w-12 opacity-50" />
                        <p className="font-medium">Not Found</p>
                     </div>
                 )}
            </div>

            {/* Right Column: Details */}
            <div className="flex-1 flex flex-col space-y-6 pt-6 md:pt-0">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold" data-testid="modal-merchant-name">{receipt.merchant_name}</DialogTitle>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        <span data-testid="modal-category">
                            {receipt.category ? tCategories(receipt.category.toLowerCase() as any, { defaultValue: receipt.category }) : tCategories('uncategorized' as any)}
                        </span>
                        <span>•</span>
                        <span data-testid="modal-date">{formattedDate}</span>
                    </div>
                </DialogHeader>

                {/* Amounts */}
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                     <div className="flex justify-between items-center text-lg font-semibold">
                        <span>{t('total')}</span>
                        <span className="text-primary" data-testid="modal-total-amount">{formatPrice(receipt.total_amount || 0, region, receipt.currency)}</span>
                     </div>
                     {receipt.tax_amount !== undefined && receipt.tax_amount !== null && (
                         <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>{t('tax')}</span>
                            <span>{formatPrice(receipt.tax_amount, region, receipt.currency)}</span>
                         </div>
                     )}
                </div>

                {/* Items List */}
                {receipt.receipt_items && receipt.receipt_items.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-semibold border-b pb-2">{t('items')}</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {receipt.receipt_items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm group hover:bg-muted/50 p-2 rounded transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.description || item.name || 'Item'}</span>
                                        {(item.quantity > 1 || item.unit_price) && (
                                            <span className="text-xs text-muted-foreground">
                                                {item.quantity} x {formatPrice(item.unit_price || 0, region, receipt.currency)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-medium">
                                        {formatPrice(item.total_price || item.amount || 0, region, receipt.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Metadata */}
                <div className="text-xs text-muted-foreground pt-4 border-t">
                    <p>{t('uploadedOn')}: {format(parseISO(receipt.created_at), "MMM d, yyyy h:mm a")}</p>
                    <p className="mt-1">ID: {receipt.id}</p>
                </div>
            </div>
        </div>

        <DialogFooter className="p-4 bg-background">
             <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
             >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {t('delete')}
             </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
