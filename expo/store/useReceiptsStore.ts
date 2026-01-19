import { create } from 'zustand';
import { Receipt } from '@/services/receipts';
import { getReceiptsByUserId, createReceipt, deleteReceipt as deleteReceiptService } from '@/services/receipts';
import { NewReceiptWithItems } from '@/services/receipts';
import { useGlobalStore } from './useGlobalStore';

interface ReceiptsState {
  receipts: Receipt[];
  isLoading: boolean;
  error: string | null;
  
  fetchReceipts: () => Promise<void>;
  addReceipt: (data: NewReceiptWithItems) => Promise<void>;
  removeReceipt: (id: string) => Promise<void>;
}

export const useReceiptsStore = create<ReceiptsState>((set, get) => ({
  receipts: [],
  isLoading: false,
  error: null,

  fetchReceipts: async () => {
    // Access global store to get user ID
    const user = useGlobalStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true, error: null });
    try {
      const data = await getReceiptsByUserId(user.id);
      set({ receipts: data || [] });
    } catch (error: any) {
      console.error('[ReceiptsStore] Failed to fetch receipts:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  addReceipt: async (data: NewReceiptWithItems) => {
    try {
      await createReceipt(data);
      // Refresh list after adding
      await get().fetchReceipts();
    } catch (error: any) {
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
      }));
    } catch (error: any) {
      console.error('[ReceiptsStore] Failed to delete receipt:', error);
      throw error;
    }
  },
}));
