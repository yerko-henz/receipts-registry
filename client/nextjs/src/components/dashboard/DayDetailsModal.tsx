import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/utils/currency';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Receipt } from '@/lib/services/receipts';
import { getCategoryIcon } from '@/constants/categories';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  receipts: Receipt[];
}

export default function DayDetailsModal({
  isOpen,
  onClose,
  date,
  receipts,
}: DayDetailsModalProps) {
  const { region } = useGlobal();
  const t = useTranslations('dashboard');

  const formattedDate = date ? format(parseISO(date), "d 'de' MMMM 'de' yyyy", { locale: es }) : '';
  const safeReceipts = receipts || [];
  const totalSpent = safeReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{t('modal.title', { date: formattedDate })}</DialogTitle>
          <DialogDescription>
            {t('modal.totalSpent')} <span className="font-bold text-primary">{formatPrice(totalSpent, region)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {safeReceipts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{t('modal.noReceipts')}</p>
          ) : (
            safeReceipts.map((receipt) => {
               const Icon = getCategoryIcon(receipt.category || 'Other');
               
               return (
                <div key={receipt.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded border">
                       <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{receipt.merchant_name || 'Unknown Merchant'}</p>
                      <p className="text-xs text-muted-foreground">
                        {receipt.category ? t(`categories.${receipt.category.toLowerCase()}`, { defaultValue: receipt.category }) : t('charts.uncategorized')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                        {formatPrice(receipt.total_amount || 0, region, receipt.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {format(parseISO(receipt.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
               );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
