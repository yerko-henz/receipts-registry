import { ReceiptData } from "@/components/receiptAnalizer/types";

export interface ReceiptAnalysisProvider {
  analyzeReceipt(base64Image: string): Promise<ReceiptData>;
}
