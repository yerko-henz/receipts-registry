import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "@/app/(app)/receiptAnalizer/types";

export const analyzeReceipt = async (base64Image: string): Promise<ReceiptData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: "Analyze this receipt carefully. Extract the merchant name, date, all line items (name, quantity, total price), subtotal, tax details (specifically look for IVA if present), discounts, and the final total. Be very precise with numbers."
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          merchantName: { type: Type.STRING },
          date: { type: Type.STRING },
          currency: { type: Type.STRING, description: "Currency symbol or code, e.g., CLP, USD, $" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.STRING },
                pricePerUnit: { type: Type.NUMBER },
                totalPrice: { type: Type.NUMBER },
              },
              required: ["name", "totalPrice"]
            }
          },
          subtotal: { type: Type.NUMBER },
          tax: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              percentage: { type: Type.NUMBER },
            },
            required: ["type", "amount"]
          },
          discounts: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
        },
        required: ["merchantName", "items", "total", "currency"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No data returned from AI analysis.");
  
  try {
    return JSON.parse(text) as ReceiptData;
  } catch (err) {
    console.error("Failed to parse AI response", text);
    throw new Error("Failed to process receipt data.");
  }
};