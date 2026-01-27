import { ReceiptCategory } from "@/constants/categories";

export interface ReceiptItem {
  name: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
}

export interface ReceiptData {
  merchantName: string;
  date: string;
  items: ReceiptItem[];
  taxAmount?: number;
  discount?: number;
  total: number;
  currency: string;
  category: ReceiptCategory;
  taxRate?: number;
  integrityScore?: number;
  imageUri?: string;
}

export interface ProcessedReceipt {
  id: string;
  uri: string;
  status: 'processing' | 'completed' | 'error';
  data?: ReceiptData;
  error?: string;
}

export interface AnalysisState {
  items: ProcessedReceipt[];
  onSave?: (data: ReceiptData) => Promise<void>;
  onSaveAll?: () => Promise<void>;
  onRetry?: () => void;
}


