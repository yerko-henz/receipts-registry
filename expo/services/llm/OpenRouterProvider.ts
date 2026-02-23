import { ReceiptData } from '@/components/receiptAnalizer/types';
import { ReceiptCategory } from '@/constants/categories';
import { calculateReceiptIntegrity } from '../receiptIntegrity';
import { ReceiptAnalysisProvider } from './types';
import { parseMonetaryValue } from '@/lib/numberParser';
import { DEFAULT_GEMINI_MODEL } from './constants';
import { useGlobalStore } from '@/store/useGlobalStore';

export class OpenRouterProvider implements ReceiptAnalysisProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_GEMINI_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeReceipt(base64Image: string, region?: string): Promise<ReceiptData> {
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://receipts-register.vercel.app',
        'X-Title': 'Receipts Register'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "Analyze this receipt and extract:\n\n1. Merchant name\n2. Date (YYYY-MM-DD)\n3. All line items: name, quantity, total price, unit price (if available)\n4. Subtotal\n5. Tax details (look for IVA)\n6. Tax rate percentage (e.g., 0.19 for 19%)\n7. Total discount (aggregate all discounts into a single value)\n8. Final total (the TOTAL AMOUNT DUE - look specifically for labels in this priority order: 'Total a Pagar', 'Total a Abonar', 'Monto Total', 'Amount Due', 'Total'. This is the amount you owe before payment. Do NOT use fields like 'Total Pagado', 'Amount Paid', 'Efectivo', 'Pago con', 'Pagar', 'Abonar', 'Change', 'Vuelto', or any payment-related fields. If both 'Total' and 'Total a Pagar' exist, use 'Total a Pagar'.)\n9. Currency (3-letter ISO code like CLP, USD, MXN)\n10. Category (one of: Food, Transport, Utilities, Entertainment, Shopping, Health, Other)\n\nCRITICAL INSTRUCTIONS FOR NUMERIC VALUES:\n- ALL numeric fields (total, taxAmount, discount, items[].totalPrice, items[].unitPrice, taxRate) MUST be returned as STRING values in the JSON response. Example: if receipt shows \"20.000\", output {\"total\": \"20.000\"} with quotes, NOT {\"total\": 20000} without quotes.\n- This is essential to preserve original formatting (thousands separators, trailing zeros).\n- Do NOT convert to numbers, do NOT parse, do NOT remove separators.\n\nRules:\n- If an item is listed by weight (KG, G), set quantity to 1\n- Do NOT include discounts (negative values) in the items array\n- Sum all negative values into the single 'discount' field\n- Ensure all extracted numbers are transcribed exactly as they appear\n- The 'total' field MUST be the exact value printed as the final total/amount due on the receipt. Do NOT calculate it from items.\n- Double-check: The total should equal (sum of item totals) + tax - discount. If it doesn't match closely, you may have extracted the wrong field.\n- IMPORTANT: If the receipt shows both an amount due and an amount paid, the total field should be the SMALLER of the two (the amount owed), not the larger (amount paid)."
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'receipt_extraction',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                merchantName: { type: 'string' },
                date: { type: 'string', description: 'YYYY-MM-DD' },
                currency: {
                  type: 'string',
                  description: '3-letter ISO code (e.g. CLP)'
                },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      quantity: {
                        type: 'string',
                        description: "As string, e.g., '2' or '1.5'"
                      },
                      totalPrice: {
                        type: 'string',
                        description: 'Exact string as on receipt'
                      },
                      unitPrice: {
                        type: 'string',
                        description: 'Exact string as on receipt, if available'
                      }
                    },
                    required: ['name', 'totalPrice']
                  }
                },
                taxAmount: {
                  type: 'string',
                  description: 'Total tax/IVA amount as exact string from receipt'
                },
                discount: {
                  type: 'string',
                  description: 'Total discount amount as exact string from receipt'
                },
                total: {
                  type: 'string',
                  description: 'Exact string as on receipt - the final total/amount due'
                },
                category: {
                  type: 'string',
                  description: 'Must be exactly one of: Food, Transport, Utilities, Entertainment, Shopping, Health, Other'
                },
                taxRate: {
                  type: 'number',
                  description: 'Tax rate as a decimal (e.g., 0.19 for 19%)'
                }
              },
              required: ['merchantName', 'date', 'total', 'currency', 'items']
            }
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No content returned from OpenRouter');

    console.log('OpenRouter Raw API Response:', JSON.stringify(data, null, 2));
    console.log('OpenRouter Response Text (JSON string):', text);

    try {
      const textData = JSON.parse(text) as RawReceiptData;

      // Parse all numeric strings using the region-specific parser
      const parsedData: ReceiptData = {
        merchantName: textData.merchantName,
        date: textData.date,
        currency: textData.currency,
        category: (textData.category as ReceiptCategory) || 'Other',
        items: textData.items.map((item) => {
          const quantity = parseMonetaryValue(item.quantity, userRegion);
          const totalPrice = parseMonetaryValue(item.totalPrice, userRegion);
          let unitPrice = item.unitPrice ? parseMonetaryValue(item.unitPrice, userRegion) : 0;

          // Handle invalid/NaN quantity: assume quantity=1 and unitPrice=totalPrice
          if (isNaN(quantity) || quantity <= 0) {
            if (!isNaN(totalPrice) && totalPrice > 0) {
              return {
                name: item.name,
                quantity: 1,
                totalPrice,
                unitPrice: totalPrice
              };
            } else {
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
        taxRate: textData.taxRate,
        integrityScore: 0
      };

      const score = calculateReceiptIntegrity(parsedData);
      parsedData.integrityScore = score;

      console.log('OpenRouter Parsed Analysis Result:', JSON.stringify(parsedData, null, 2));
      return parsedData;
    } catch (err) {
      console.error('OpenRouter Response Text (Parse Failed):', text);
      console.error('Failed to parse response error:', err);
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
