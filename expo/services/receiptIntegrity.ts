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
  const detectedTax = data.taxAmount || 0;
  const discount = data.discount || 0;
  const reportedTotal = Number(data.total.toFixed(2));
  
  // Strategy: Try both tax-inclusive and tax-exclusive models
  const totalExclusive = Number((itemsSum + detectedTax - discount).toFixed(2));
  const totalInclusive = Number((itemsSum - discount).toFixed(2));
  
  const diffExclusive = Math.abs(totalExclusive - reportedTotal);
  const diffInclusive = Math.abs(totalInclusive - reportedTotal);
  
  const bestDiff = Math.min(diffExclusive, diffInclusive);
  const isInclusive = diffInclusive < diffExclusive;

  if (bestDiff > 0.1) {
    const penalty = Math.min(30, (bestDiff / reportedTotal) * 100);
    score -= penalty;
    penalties.push(`Total mismatch: best variant diff ${bestDiff.toFixed(2)} (${isInclusive ? 'Inclusive' : 'Exclusive'} model)`);
  } else {
    console.log(`[ReceiptIntegrity] Sum check passed using ${isInclusive ? 'Tax-Inclusive' : 'Tax-Exclusive'} model.`);
  }

  // 1b. Implied Tax Check (Requested by User)
  // Logic: Divide by (1+Tax Rate) to derive the implied Net Total.
  // Subtract the Net Total from the Final Total.
  // Compare against Tax Amount printed.
  if (data.taxRate && data.taxRate > 0) {
    const impliedNetTotal = reportedTotal / (1 + data.taxRate);
    const impliedTaxAmount = reportedTotal - impliedNetTotal;
    const taxIntegrityDiff = Math.abs(impliedTaxAmount - detectedTax);
    
    // If tax mismatch is > 0.5 (larger buffer for tax rounding/implied calc)
    if (taxIntegrityDiff > 1.0) {
      const penalty = Math.min(20, (taxIntegrityDiff / detectedTax) * 100);
      score -= penalty;
      penalties.push(`Tax rate integrity mismatch: implied tax ${impliedTaxAmount.toFixed(2)}, detected ${detectedTax}`);
    }
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
