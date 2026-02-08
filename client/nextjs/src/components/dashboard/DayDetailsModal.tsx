import { formatPrice } from '@/lib/utils/currency';
import { useGlobal } from '@/lib/context/GlobalContext';

// ...

export default function DayDetailsModal({
  isOpen,
  onClose,
  date,
  receipts,
}: DayDetailsModalProps) {
  const { region } = useGlobal(); // Get region
  const t = useTranslations('dashboard'); // Reuse receipts translations or generic

  const formattedDate = date ? format(parseISO(date), 'MMMM do, yyyy') : '';
  const totalSpent = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);

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
          {receipts.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t('modal.noReceipts')}</p>
          ) : (
            receipts.map((receipt) => {
               // Use standard icon if category missing, or get specific
               const Icon = getCategoryIcon(receipt.category || 'Other');
               
               return (
                <div key={receipt.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded border">
                       <Icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{receipt.merchant_name || 'Unknown Merchant'}</p>
                      <p className="text-xs text-muted-foreground">{receipt.category}</p>
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
