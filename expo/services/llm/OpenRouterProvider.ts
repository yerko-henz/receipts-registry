import { ReceiptData } from "@/components/receiptAnalizer/types";
import { calculateReceiptIntegrity } from "../receiptIntegrity";
import { ReceiptAnalysisProvider } from "./types";

export class OpenRouterProvider implements ReceiptAnalysisProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "google/gemini-2.0-flash-001") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeReceipt(base64Image: string): Promise<ReceiptData> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://github.com/yerko-henz/receipts-registry", // Optional, for OpenRouter rankings
        "X-Title": "Receipts Registry", // Optional
      },
      body: JSON.stringify({
        model: this.model,
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
                  url: `data:image/jpeg;base64,${base64Image.split(',')[1] || base64Image}`,
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
      throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const text = result.choices[0].message.content;

    try {
      const data = JSON.parse(text) as ReceiptData;
      data.integrityScore = calculateReceiptIntegrity(data);
      console.log("OpenRouter Analysis Result:", JSON.stringify(data, null, 2));
      return data;
    } catch (err) {
      console.error("OpenRouter Parse Failed:", text);
      throw new Error("Failed to process receipt data from OpenRouter.");
    }
  }
}
