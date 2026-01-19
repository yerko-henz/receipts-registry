import { create } from 'zustand';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { analyzeReceipt } from '@/services/processReceipt';
import { isIntegrityAcceptable } from '@/services/receiptIntegrity';
import { ReceiptData } from '@/components/receiptAnalizer/types';

export type AnalysisItem = {
  id: string;
  uri: string;
  status: 'processing' | 'completed' | 'error';
  data?: ReceiptData;
  error?: string;
};

interface ScannerState {
  items: AnalysisItem[];
  isScanning: boolean;
  
  processImages: (assets: ImagePicker.ImagePickerAsset[]) => Promise<void>;
  resetScanner: () => void;
}

export const useScannerStore = create<ScannerState>((set, get) => ({
  items: [],
  isScanning: false,

  processImages: async (assets: ImagePicker.ImagePickerAsset[]) => {
    set({ isScanning: true });
    
    // Add initial items with processing status
    const newItems: AnalysisItem[] = assets.map(asset => ({
      id: Math.random().toString(36).substring(7),
      uri: asset.uri,
      status: 'processing',
    }));

    set((state) => ({ items: [...state.items, ...newItems] }));

    // Process each image concurrently
    // Note: We use a loop/forEach here but don't await the entire batch to finish 
    // before updating UI for individual items.
    assets.forEach(async (asset, index) => {
      const itemId = newItems[index].id;

      try {
        let base64 = asset.base64;
        if (!base64) {
          base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        }
        
        if (!base64) throw new Error('Could not read image data');
        
        // Initial analysis
        let data = await analyzeReceipt(base64);

        // Check integrity and retry logic
        if (data.integrityScore !== undefined && !isIntegrityAcceptable(data.integrityScore)) {
          console.log(`[ScannerStore] Low integrity (${data.integrityScore}) for ${data.merchantName}. Retrying...`);
          try {
             // Retry analysis
             const retriedData = await analyzeReceipt(base64);
             
             if ((retriedData.integrityScore || 0) > (data.integrityScore || 0)) {
               console.log(`[ScannerStore] Retry success! Improved integrity.`);
               data = retriedData;
             }
          } catch (retryErr) {
             console.error(`[ScannerStore] Retry failed:`, retryErr);
          }
        }

        // Update item to completed
        set((state) => ({
          items: state.items.map(item => 
            item.id === itemId 
              ? { ...item, status: 'completed', data } 
              : item
          )
        }));

      } catch (err: any) {
        console.error(`[ScannerStore] Failed to process item ${itemId}:`, err);
        set((state) => ({
          items: state.items.map(item => 
            item.id === itemId 
              ? { ...item, status: 'error', error: err.message || 'Analysis failed' } 
              : item
          )
        }));
      }
    });
    
    set({ isScanning: false });
  },

  resetScanner: () => set({ items: [] }),
}));
