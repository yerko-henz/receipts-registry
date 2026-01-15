export interface ReceiptItem {
  name: string;
  quantity: string | number;
  pricePerUnit?: number;
  totalPrice: number;
}

export interface TaxInfo {
  type: string;
  amount: number;
  percentage?: number;
}

export interface ReceiptData {
  merchantName: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: TaxInfo;
  discounts: number;
  total: number;
  currency: string;
}

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  data: ReceiptData | null;
}
