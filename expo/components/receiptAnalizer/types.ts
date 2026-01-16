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
  category: string;
}

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  data: ReceiptData | null;
  onSave?: (data: ReceiptData) => Promise<void>;
}
