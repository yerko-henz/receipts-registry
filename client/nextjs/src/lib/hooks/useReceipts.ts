import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecentReceipts, getReceiptsByUserId, createReceipt, ReceiptFilters, NewReceiptWithItems } from '@/lib/services/receipts';

export const useRecentReceipts = (userId: string | undefined, days: number = 7) => {
  return useQuery({
    queryKey: ['recent_receipts', userId, days],
    queryFn: () => getRecentReceipts(userId!, days),
    enabled: !!userId,
  });
};

export const useReceipts = (userId: string | undefined, page: number, pageSize: number = 20, filters?: ReceiptFilters) => {
    return useQuery({
      queryKey: ['receipts', userId, page, pageSize, filters],
      queryFn: () => getReceiptsByUserId(userId!, page, pageSize, filters),
      enabled: !!userId,
    });
  };

export const useCreateReceipt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newReceipt: NewReceiptWithItems) => createReceipt(newReceipt),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            queryClient.invalidateQueries({ queryKey: ['recent_receipts'] });
        }
    });
};
