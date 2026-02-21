"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "@/lib/types/receipt";
import { calculateReceiptIntegrity } from "@/lib/services/receiptIntegrity";

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

export async function analyzeReceiptAction(formData: FormData) {
  const file = formData.get("file") as File;
  const providerType = process.env.NEXT_PUBLIC_LLM_PROVIDER || 'gemini';
  
  if (!file) {
    return { error: "No file uploaded" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    
    let data: ReceiptData;

    if (providerType.toLowerCase() === 'openrouter') {
      const openRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (!openRouterKey) return { error: "OpenRouter API Key not configured" };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://github.com/yerko-henz/receipts-registry",
          "X-Title": "Receipts Registry Web",
        },
        body: JSON.stringify({
          model: DEFAULT_OPENROUTER_MODEL,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this receipt carefully. Extract the merchant name, date, all line items (name, quantity, total price), subtotal, tax details (specifically look for IVA if present), the tax rate percentage (e.g., 0.19 for 19%), aggregate all discounts into a single value, and the final total. Be very precise with numbers.\n\nCRITICAL: NUMBER PARSING LOGIC\n\n    First, Detect the Region/Currency:\n\n        Look for clues: Country name, Address, Phone Code, or Currency Symbol (US$, CLP, MXN, R$, S/).\n\n    Apply the Correct Separator Rule:\n\n        IF Region is Chile, Argentina, Colombia, Uruguay, Brazil, Paraguay:\n\n            The DOT (.) is a Thousands Separator. (e.g., 10.000 = Ten Thousand).\n\n            The COMMA (,) is a Decimal Separator.\n\n            Action: Ignore dots, replace commas with dots for JSON.\n\n        IF Region is USA, Mexico, Peru, Panama, Ecuador, El Salvador:\n\n            The DOT (.) is a Decimal Separator. (e.g., 10.50 = Ten point five).\n\n            The COMMA (,) is a Thousands Separator.\n\n            Action: Ignore commas, keep dots for JSON.\n\n    Ambiguity Check (The 'Coke' Test):\n\n        If the currency is ambiguous (just '$'), use the magnitude to decide.\n\n        If a common item (Soda, Bread) is written as 2.500:\n\n            In USA/Mexico, that price is impossible ($2,500 for a soda). Therefore, treat . as thousands -> 2500.\n\n            In Chile/Colombia, 2500 is normal.\n\nOUTPUT REQUIREMENT: Return the final value as a standard JSON Number (e.g., 2500 or 10.50).\n\nRules for items:\n1. If an item is listed by weight (e.g., KG, G), set its quantity to 1.\n2. Do NOT include discounts (negative values) in the items array.\n3. Sum all negative values/discounts into the single 'discount' field at the top level (as a positive number, e.g., if it says -1000, put 1000 in discount).\n4. Ensure all extracted numbers are accurate."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${file.type || 'image/jpeg'};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: `OpenRouter API error: ${JSON.stringify(errorData)}` };
      }

      const result = await response.json();
      const text = result.choices[0].message.content;
      data = JSON.parse(text) as ReceiptData;
    } else {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) return { error: "Gemini API Key not configured" };

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
      if (!text) return { error: "No data returned from AI" };
      data = JSON.parse(text) as ReceiptData;
    }

    data.integrityScore = calculateReceiptIntegrity(data);
    return { success: true, data };

  } catch (error: any) {
    console.error("Analyze Error", error);
    return { error: error.message };
  }
}
