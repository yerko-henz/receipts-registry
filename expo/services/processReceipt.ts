import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "@/components/receiptAnalizer/types";
import { calculateReceiptIntegrity } from "./receiptIntegrity";

export const analyzeReceipt = async (base64Image: string): Promise<ReceiptData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
      text: "Analyze this receipt carefully. Extract the merchant name, date, all line items (name, quantity, total price), subtotal, tax details (specifically look for IVA if present), aggregate all discounts into a single value, and the final total. Be very precise with numbers.\n\nRules for items:\n1. If an item is listed by weight (e.g., KG, G), set its quantity to 1.\n2. Do NOT include discounts (negative values) in the items array.\n3. Sum all negative values/discounts into the single 'discount' field at the top level (as a positive number, e.g., if it says -1000, put 1000 in discount).\n4. Ensure all extracted numbers are accurate."
}
      ]
    },
    config: {
      responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        merchantName: { type: Type.STRING },
        date: { type: Type.STRING, description: "YYYY-MM-DD" },
        currency: { type: Type.STRING, description: "3-letter ISO code (e.g. CLP)" },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER }, 
              totalPrice: { type: Type.NUMBER },
              unitPrice: { type: Type.NUMBER },
            },
            required: ["name", "totalPrice"]
          }
        },
        taxAmount: { type: Type.NUMBER, description: "Total tax/IVA amount" },
        discount: { type: Type.NUMBER, description: "Total discount amount (sum of all negative fields)" },
        total: { type: Type.NUMBER },
        category: { 
          type: Type.STRING, 
          description: "One word: Food, Transport, Shopping, Health, or Other" 
        },
      },
      required: ["merchantName", "date", "total", "currency", "items"]
    }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No data returned from AI analysis.");
  
  try {
    const data = JSON.parse(text) as ReceiptData;
    
    // Add integrity score calculation
    data.integrityScore = calculateReceiptIntegrity(data);
    
    console.log("Gemini AI Analysis Result:", JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error("Gemini AI Response Text (Parse Failed):", text);
    console.error("Failed to parse AI response error:", err);
    throw new Error("Failed to process receipt data.");
  }
};