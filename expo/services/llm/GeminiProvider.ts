import { GoogleGenAI, Type } from '@google/genai';
import { ReceiptData } from '@/components/receiptAnalizer/types';
import { ReceiptCategory } from '@/constants/categories';
import { calculateReceiptIntegrity } from '../receiptIntegrity';
import { ReceiptAnalysisProvider } from './types';
import { parseMonetaryValue } from '@/lib/numberParser';
import { DEFAULT_GEMINI_MODEL } from './constants';
import { useGlobalStore } from '@/store/useGlobalStore';

export class GeminiProvider implements ReceiptAnalysisProvider {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = DEFAULT_GEMINI_MODEL) {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async analyzeReceipt(base64Image: string, region?: string): Promise<ReceiptData> {
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image
            }
          },
          {
            text: 'Analyze this receipt and extract:\n\n1. Merchant name\n2. Date (YYYY-MM-DD)\n3. All line items: name, quantity, total price, unit price (if available)\n4. Subtotal\n5. Tax details (look for IVA)\n6. Tax rate percentage (e.g., 0.19 for 19%)\n7. Total discount (aggregate all discounts into a single value)\n8. Final total (the TOTAL AMOUNT DUE - the amount owed before payment)\n\nEXTRACTION RULES:\n- Label Association: Before assigning a value to a field, you must identify the text label directly to the left of or above the number.\n- Horizontal Priority: When two numbers are side-by-side, the value immediately following the label is the primary data point.\n\nCRITICAL RULE FOR TOTAL: The \'total\' must be the amount OWED before payment. This total should approximately equal (sum of item totals) + tax - discount. If you see two candidate values, choose the one that satisfies this formula. When uncertain, pick the SMALLER value (amount owed is never larger than amount paid).\n\n9. Currency (3-letter ISO code like CLP, USD, MXN)\n10. Category (one of: Food, Transport, Utilities, Entertainment, Shopping, Health, Other)\n\nCRITICAL INSTRUCTIONS FOR NUMERIC VALUES:\n- ALL numeric fields (total, taxAmount, discount, items[].totalPrice, items[].unitPrice, taxRate) MUST be returned as STRING values in the JSON response. Example: if receipt shows "20.000", output {"total": "20.000"} with quotes, NOT {"total": 20000} without quotes.\n- This is essential to preserve original formatting (thousands separators, trailing zeros).\n- Do NOT convert to numbers, do NOT parse, do NOT remove separators.\n\nRules:\n- If an item is listed by weight (KG, G), set quantity to 1\n- Do NOT include discounts (negative values) in the items array\n- Sum all negative values into the single \'discount\' field\n- Ensure all extracted numbers are transcribed exactly as they appear\n- The \'total\' field MUST be the exact value printed as the final total/amount due on the receipt. Do NOT calculate it from items.\n- Double-check: The total should equal (sum of item totals) + tax - discount. If it doesn\'t match closely, you may have extracted the wrong field.'
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchantName: { type: Type.STRING },
            date: { type: Type.STRING, description: 'YYYY-MM-DD' },
            currency: {
              type: Type.STRING,
              description: '3-letter ISO code (e.g. CLP)'
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: {
                    type: Type.STRING,
                    description: "As string, e.g., '2' or '1.5'"
                  },
                  totalPrice: {
                    type: Type.STRING,
                    description: 'Exact string as on receipt'
                  },
                  unitPrice: {
                    type: Type.STRING,
                    description: 'Exact string as on receipt, if available'
                  }
                },
                required: ['name', 'totalPrice']
              }
            },
            taxAmount: {
              type: Type.STRING,
              description: 'Total tax/IVA amount as exact string from receipt'
            },
            discount: {
              type: Type.STRING,
              description: 'Total discount amount as exact string from receipt'
            },
            total: {
              type: Type.STRING,
              description: 'Exact string as on receipt - the final total/amount due'
            },
            category: {
              type: Type.STRING,
              description: 'Must be exactly one of: Food, Transport, Utilities, Entertainment, Shopping, Health, Other'
            },
            taxRate: {
              type: Type.NUMBER,
              description: 'Tax rate as a decimal (e.g., 0.19 for 19%)'
            }
          },
          required: ['merchantName', 'date', 'total', 'currency', 'items']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error('No data returned from AI analysis.');

    console.log('Gemini Raw API Response:', JSON.stringify(response, null, 2));
    console.log('Gemini Response Text (JSON string):', text);

    try {
      const textData = JSON.parse(text) as RawReceiptData;

      // Use provided region or fall back to store/default
      const userRegion =
        region ||
        (() => {
          try {
            const r = useGlobalStore.getState().region;
            return r || 'en-US';
          } catch {
            return 'en-US';
          }
        })();

      // Parse all numeric strings using the region-specific parser
      const parsedData: ReceiptData = {
        merchantName: textData.merchantName,
        date: textData.date,
        currency: textData.currency,
        // Ensure category is a valid ReceiptCategory, default to 'Other' if not
        category: (textData.category as ReceiptCategory) || 'Other',
        items: textData.items.map((item) => {
          const quantity = parseMonetaryValue(item.quantity, userRegion);
          const totalPrice = parseMonetaryValue(item.totalPrice, userRegion);
          let unitPrice = item.unitPrice ? parseMonetaryValue(item.unitPrice, userRegion) : 0;

          // Handle invalid/NaN quantity: assume quantity=1 and unitPrice=totalPrice
          if (isNaN(quantity) || quantity <= 0) {
            if (!isNaN(totalPrice) && totalPrice > 0) {
              // Set quantity to 1 and unitPrice equal to totalPrice
              // This is a reasonable fallback for items sold by unit
              return {
                name: item.name,
                quantity: 1,
                totalPrice,
                unitPrice: totalPrice
              };
            } else {
              // Both invalid, keep as 0 (will be caught by integrity check)
              return {
                name: item.name,
                quantity: 0,
                totalPrice,
                unitPrice: 0
              };
            }
          }

          // If unitPrice is 0 or not provided, calculate from totalPrice/quantity
          if (!unitPrice && quantity > 0) {
            unitPrice = totalPrice / quantity;
          }

          return {
            name: item.name,
            quantity,
            totalPrice,
            unitPrice
          };
        }),
        taxAmount: textData.taxAmount ? parseMonetaryValue(textData.taxAmount, userRegion) : undefined,
        discount: textData.discount ? parseMonetaryValue(textData.discount, userRegion) : undefined,
        total: parseMonetaryValue(textData.total, userRegion),
        taxRate: textData.taxRate, // Already a number
        integrityScore: 0 // will be calculated below
      };

      const score = calculateReceiptIntegrity(parsedData);
      parsedData.integrityScore = score;

      console.log('Gemini Parsed Analysis Result:', JSON.stringify(parsedData, null, 2));
      return parsedData;
    } catch (err) {
      console.error('Gemini Response Text (Parse Failed):', text);
      console.error('Failed to parse AI response error:', err);
      throw new Error('Failed to process receipt data.');
    }
  }
}

// Temporary interface for raw data from AI (strings for numbers)
interface RawReceiptData {
  merchantName: string;
  date: string;
  currency: string;
  items: {
    name: string;
    quantity: string;
    totalPrice: string;
    unitPrice?: string;
  }[];
  taxAmount?: string;
  discount?: string;
  total: string;
  category: string;
  taxRate?: number;
}
