import { ReceiptData } from "@/components/receiptAnalizer/types";

export const INTEGRITY_THRESHOLD = 80;

/**
 * Calculates a confidence/integrity score for a receipt based on mathematical consistency.
 * Returns a score between 0 and 100.
 */
export const calculateReceiptIntegrity = (data: ReceiptData): number => {
  let score = 100;
  const penalties: string[] = [];

  // 1. Sum Check: Items + Tax - Discount = Total
  const itemsSum = data.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const tax = data.taxAmount || 0;
  const discount = data.discount || 0;
  const calculatedTotal = Number((itemsSum + tax - discount).toFixed(2));
  const reportedTotal = Number(data.total.toFixed(2));

  const totalDiff = Math.abs(calculatedTotal - reportedTotal);
  if (totalDiff > 0.01) {
    // Heavy penalty for total mismatch
    const penalty = Math.min(40, (totalDiff / reportedTotal) * 100);
    score -= penalty;
    penalties.push(`Total mismatch: diff ${totalDiff}`);
  }

  // 2. Line Item Check: quantity * unitPrice = totalPrice
  data.items.forEach((item, index) => {
    if (item.quantity && item.unitPrice && item.totalPrice) {
      const calcLineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      const lineDiff = Math.abs(calcLineTotal - item.totalPrice);
      if (lineDiff > 0.01) {
        score -= 5; // Small penalty per inconsistent line
        penalties.push(`Line ${index + 1} mismatch`);
      }
    }
  });

  // 3. Data Completeness Check
  if (!data.merchantName || data.merchantName.toLowerCase() === 'unknown') {
    score -= 10;
    penalties.push("Missing merchant name");
  }
  if (!data.date || isNaN(Date.parse(data.date))) {
    score -= 10;
    penalties.push("Invalid date");
  }
  if (data.total <= 0) {
    score -= 20;
    penalties.push("Zero or negative total");
  }
  if (data.items.length === 0) {
    score -= 20;
    penalties.push("No items found");
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  if (penalties.length > 0) {
    console.log(`[ReceiptIntegrity] Score: ${finalScore}, Penalties:`, penalties);
  } else {
    console.log(`[ReceiptIntegrity] Perfect Score: ${finalScore}`);
  }

  return finalScore;
};

/**
 * Checks if the integrity score meets the minimum requirement.
 */
export const isIntegrityAcceptable = (score: number): boolean => {
  return score >= INTEGRITY_THRESHOLD;
};
