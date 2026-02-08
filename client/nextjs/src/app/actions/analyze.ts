"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "@/lib/types/receipt";
import { calculateReceiptIntegrity } from "@/lib/services/receiptIntegrity";

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

export async function analyzeReceiptAction(formData: FormData) {
  const file = formData.get("file") as File;
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY; 

  if (!file) {
    return { error: "No file uploaded" };
  }
  if (!apiKey) {
    return { error: "API Key not configured" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type || 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: "Analyze this receipt carefully. Extract the merchant name, date, all line items (name, quantity, total price), subtotal, tax details (specifically look for IVA if present), the tax rate percentage (e.g., 0.19 for 19%), aggregate all discounts into a single value, and the final total. Be very precise with numbers.\n\nCRITICAL: NUMBER PARSING LOGIC\n\n    First, Detect the Region/Currency:\n\n        Look for clues: Country name, Address, Phone Code, or Currency Symbol (US$, CLP, MXN, R$, S/).\n\n    Apply the Correct Separator Rule:\n\n        IF Region is Chile, Argentina, Colombia, Uruguay, Brazil, Paraguay:\n\n            The DOT (.) is a Thousands Separator. (e.g., 10.000 = Ten Thousand).\n\n            The COMMA (,) is a Decimal Separator.\n\n            Action: Ignore dots, replace commas with dots for JSON.\n\n        IF Region is USA, Mexico, Peru, Panama, Ecuador, El Salvador:\n\n            The DOT (.) is a Decimal Separator. (e.g., 10.50 = Ten point five).\n\n            The COMMA (,) is a Thousands Separator.\n\n            Action: Ignore commas, keep dots for JSON.\n\n    Ambiguity Check (The 'Coke' Test):\n\n        If the currency is ambiguous (just '$'), use the magnitude to decide.\n\n        If a common item (Soda, Bread) is written as 2.500:\n\n            In USA/Mexico, that price is impossible ($2,500 for a soda). Therefore, treat . as thousands -> 2500.\n\n            In Chile/Colombia, 2500 is normal.\n\nOUTPUT REQUIREMENT: Return the final value as a standard JSON Number (e.g., 2500 or 10.50).\n\nRules for items:\n1. If an item is listed by weight (e.g., KG, G), set its quantity to 1.\n2. Do NOT include discounts (negative values) in the items array.\n3. Sum all negative values/discounts into the single 'discount' field at the top level (as a positive number, e.g., if it says -1000, put 1000 in discount).\n4. Ensure all extracted numbers are accurate."
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
              description: "Must be exactly one of: Food, Transport, Utilities, Entertainment, Shopping, Health, Other" 
            },
            taxRate: { type: Type.NUMBER, description: "Tax rate as a decimal (e.g., 0.19 for 19%)" },
          },
          required: ["merchantName", "date", "total", "currency", "items"]
        }
      }
    });

    const text = response.text;
    if (!text) {
        return { error: "No data returned from AI" };
    };
    
    const data = JSON.parse(text) as ReceiptData;
    const score = calculateReceiptIntegrity(data);
    data.integrityScore = score;
    
    return { success: true, data };

  } catch (error: any) {
    console.error("Analyze Error", error);
    return { error: error.message };
  }
}
