import { ReceiptData } from "@/components/receiptAnalizer/types";

export interface ReceiptAnalysisProvider {
  analyzeReceipt(base64Image: string, region?: string): Promise<ReceiptData>;
}
