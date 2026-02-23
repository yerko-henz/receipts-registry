export interface ReceiptItem {
  name: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
}

export interface ReceiptData {
  merchantName: string;
  date: string;
  currency: string;
  items: ReceiptItem[];
  taxAmount?: number;
  discount?: number;
  total: number;
  category?: string;
  taxRate?: number;
  integrityScore?: number;
}

export interface ReceiptWithImage extends ReceiptData {
  imageFile: File;
}
