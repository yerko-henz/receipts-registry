'use server';

import { ReceiptData } from '@/lib/types/receipt';
import { calculateReceiptIntegrity } from '@/lib/services/receiptIntegrity';
import { cookies } from 'next/headers';
import { parseMonetaryValue } from '@/lib/utils/numberParser';
import { DEFAULT_OPENROUTER_MODEL } from '@/constants/llm';

// Simple provider interface for web (mirrors mobile)
interface LLMProvider {
  analyzeReceipt(base64Image: string, region?: string): Promise<ReceiptData>;
}

// Factory function for web (reads from env)
function getLLMProvider(): LLMProvider {
  const providerType = process.env.NEXT_PUBLIC_LLM_PROVIDER || 'openrouter';
  const apiKey = providerType === 'openrouter' ? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY : process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(`API key not set for provider: ${providerType}. Check NEXT_PUBLIC_${providerType.toUpperCase()}_API_KEY`);
  }

  // For now, we'll implement OpenRouter directly in the web action
  // In the future, this could be extracted to a shared library
  return {
    async analyzeReceipt(base64Image: string, region?: string): Promise<ReceiptData> {
      const userRegion = region || (await cookies()).get('NEXT_REGION')?.value || 'en-US';

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://receipts-register.vercel.app',
          'X-Title': 'Receipts Register'
        },
        body: JSON.stringify({
          model: DEFAULT_OPENROUTER_MODEL,
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

      console.log('Web OpenRouter Raw API Response:', JSON.stringify(data, null, 2));
      console.log('Web OpenRouter Response Text (JSON string):', text);

      const rawData = JSON.parse(text) as RawReceiptData;

      // Parse all numeric strings using the region-specific parser
      const parsedData: ReceiptData = {
        merchantName: rawData.merchantName,
        date: rawData.date,
        currency: rawData.currency,
        category: rawData.category,
        items: rawData.items.map((item) => {
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
        taxAmount: rawData.taxAmount ? parseMonetaryValue(rawData.taxAmount, userRegion) : undefined,
        discount: rawData.discount ? parseMonetaryValue(rawData.discount, userRegion) : undefined,
        total: parseMonetaryValue(rawData.total, userRegion),
        taxRate: rawData.taxRate,
        integrityScore: 0
      };

      const score = calculateReceiptIntegrity(parsedData);
      parsedData.integrityScore = score;

      console.log('Web OpenRouter Parsed Analysis Result:', JSON.stringify(parsedData, null, 2));
      return parsedData;
    }
  };
}

export async function analyzeReceiptAction(formData: FormData) {
  const file = formData.get('file') as File;

  if (!file) {
    return { error: 'No file uploaded' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    const provider = getLLMProvider();
    const parsedData = await provider.analyzeReceipt(base64Image);

    return { success: true, data: parsedData };
  } catch (error: unknown) {
    console.error('Analyze Error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
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
