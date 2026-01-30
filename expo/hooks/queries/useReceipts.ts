import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { 
    getReceiptsByUserId, 
    getReceiptById, 
    getRecentReceipts, 
    createReceipt, 
    createReceipts, 
    deleteReceipt,
    ReceiptFilters,
    NewReceiptWithItems
} from '@/services/receipts';
import { ReceiptData } from '@/components/receiptAnalizer/types';

export const useReceipts = (userId: string | undefined, page: number, pageSize: number = 20, filters?: ReceiptFilters) => {
  return useQuery({
    queryKey: ['receipts', userId, page, pageSize, filters],
    queryFn: () => getReceiptsByUserId(userId!, page, pageSize, filters),
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
};

export const useInfiniteReceipts = (userId: string | undefined, pageSize: number = 20, filters?: ReceiptFilters) => {
  return useInfiniteQuery({
    queryKey: ['receipts', 'infinite', userId, pageSize, filters],
    queryFn: ({ pageParam = 1 }) => getReceiptsByUserId(userId!, pageParam as number, pageSize, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // lastPage is the result of getReceiptsByUserId: { data, count, page, pageSize, hasMore }
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    enabled: !!userId,
  });
};

export const useReceipt = (id: string) => {
  return useQuery({
    queryKey: ['receipt', id],
    queryFn: () => getReceiptById(id),
    enabled: !!id,
  });
};

export const useRecentReceipts = (userId: string | undefined, days: number = 7) => {
  return useQuery({
    queryKey: ['recent_receipts', userId, days],
    queryFn: () => getRecentReceipts(userId!, days),
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

export const useCreateBatchReceipts = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (receipts: ReceiptData[]) => createReceipts(receipts),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            queryClient.invalidateQueries({ queryKey: ['recent_receipts'] });
        }
    });
};

export const useDeleteReceipt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteReceipt(id),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['receipts'] });
             queryClient.invalidateQueries({ queryKey: ['recent_receipts'] });
        }
    });
};
