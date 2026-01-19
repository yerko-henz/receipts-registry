import { ReceiptData } from "@/components/receiptAnalizer/types";
import { getLLMProvider } from "./llm/factory";

export const analyzeReceipt = async (base64Image: string): Promise<ReceiptData> => {
  const provider = getLLMProvider();
  return await provider.analyzeReceipt(base64Image);
};