import { create } from 'zustand';
import { Receipt, ReceiptFilters } from '@/services/receipts';
import { getReceiptsByUserId, createReceipt, deleteReceipt as deleteReceiptService } from '@/services/receipts';
import { NewReceiptWithItems } from '@/services/receipts';
import { useGlobalStore } from './useGlobalStore';

interface ReceiptsState {
  receipts: Receipt[];
  isLoading: boolean;
  error: string | null;
  
  // Pagination & Filtering
  page: number;
  hasMore: boolean;
  totalCount: number;
  filters: ReceiptFilters;

  actions: {
    setFilters: (filters: Partial<ReceiptFilters>) => void;
    fetchReceipts: (options?: { reset?: boolean }) => Promise<void>;
    addReceipt: (data: NewReceiptWithItems) => Promise<void>;
    removeReceipt: (id: string) => Promise<void>;
  }
}

export const useReceiptsStore = create<ReceiptsState>((set, get) => ({
  receipts: [],
  isLoading: false,
  error: null,

  page: 1,
  hasMore: true,
  totalCount: 0,
  filters: {
      category: 'All',
      searchQuery: '',
      dateMode: 'created' // Default to created (upload date) as requested
  },

  actions: {
      setFilters: (newFilters) => {
          set((state) => ({
              filters: { ...state.filters, ...newFilters }
          }));
          // Auto-trigger refresh when filters change? 
          // Often better to let UI trigger it or debounced.
          // But for strict state consistency, let's triggering it lazily or explicit.
          // Let's assume UI calls fetchReceipts({ reset: true }) after setting filters.
      },

      fetchReceipts: async ({ reset = false } = {}) => {
        const user = useGlobalStore.getState().user;
        if (!user) return;
        
        const state = get();
        // If loading, skip?
        if (state.isLoading && !reset) return;

        const nextPage = reset ? 1 : state.page + 1;
        
        // If not reset and no more data, skip
        if (!reset && !state.hasMore) return;

        if (reset) {
            set({ receipts: [], isLoading: true, error: null });
        } else {
            set({ isLoading: true, error: null });
        }

        try {
          const result = await getReceiptsByUserId(user.id, nextPage, 20, state.filters);
          
          set((currentState) => ({
            receipts: reset ? result.data : [...currentState.receipts, ...result.data],
            page: nextPage,
            hasMore: result.hasMore,
            totalCount: result.count || 0,
            isLoading: false
          }));
        } catch (error: unknown) {
          console.warn('[ReceiptsStore] Failed to fetch receipts:', error);
          if (typeof error === 'object') {
              try {
                  console.warn('[ReceiptsStore] Error details:', JSON.stringify(error, null, 2));
              } catch (e) {
                  // ignore
              }
          }
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message, isLoading: false });
        }
      },

      addReceipt: async (data: NewReceiptWithItems) => {
        try {
          await createReceipt(data);
          // Refresh list after adding to ensure sort order/filtering correctness
          await get().actions.fetchReceipts({ reset: true });
        } catch (error: unknown) {
          console.error('[ReceiptsStore] Failed to add receipt:', error);
          throw error;
        }
      },

      removeReceipt: async (id: string) => {
        try {
          await deleteReceiptService(id);
          // Optimistic update
          set((state) => ({
            receipts: state.receipts.filter((r) => r.id !== id),
            totalCount: state.totalCount - 1
          }));
        } catch (error: unknown) {
          console.error('[ReceiptsStore] Failed to delete receipt:', error);
          throw error;
        }
      },
  }
}));

// Export hooks for convenience if needed, or just use useReceiptsStore
export const useReceiptsActions = () => useReceiptsStore((state) => state.actions);
