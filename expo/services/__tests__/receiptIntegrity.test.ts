import { calculateReceiptIntegrity, isIntegrityAcceptable, INTEGRITY_THRESHOLD } from '../receiptIntegrity';
import { ReceiptData } from '@/components/receiptAnalizer/types';

describe('receiptIntegrity', () => {
  const createMockReceipt = (overrides: Partial<ReceiptData> = {}): ReceiptData => ({
    merchantName: 'Test Store',
    date: '2024-01-15',
    total: 100,
    items: [
      { name: 'Item 1', quantity: 2, unitPrice: 25, totalPrice: 50, category: 'groceries' },
      { name: 'Item 2', quantity: 1, unitPrice: 50, totalPrice: 50, category: 'groceries' },
    ],
    taxAmount: 0,
    discount: 0,
    ...overrides,
  });

  describe('calculateReceiptIntegrity', () => {
    it('returns 100 for a perfect receipt', () => {
      const receipt = createMockReceipt();
      const score = calculateReceiptIntegrity(receipt);
      expect(score).toBe(100);
    });

    it('penalizes missing merchant name', () => {
      const receipt = createMockReceipt({ merchantName: '' });
      const score = calculateReceiptIntegrity(receipt);
      expect(score).toBeLessThan(100);
    });

    it('penalizes invalid date', () => {
      const receipt = createMockReceipt({ date: 'not-a-date' });
      const score = calculateReceiptIntegrity(receipt);
      expect(score).toBeLessThan(100);
    });

    it('penalizes zero total', () => {
      const receipt = createMockReceipt({ total: 0 });
      const score = calculateReceiptIntegrity(receipt);
      expect(score).toBeLessThan(100);
    });

    it('penalizes no items', () => {
      const receipt = createMockReceipt({ items: [] });
      const score = calculateReceiptIntegrity(receipt);
      expect(score).toBeLessThan(100);
    });

    it('penalizes total mismatch', () => {
      const receipt = createMockReceipt({ total: 200 }); // Items sum to 100
      const score = calculateReceiptIntegrity(receipt);
      expect(score).toBeLessThan(100);
    });

    it('penalizes line item mismatch', () => {
      const receipt = createMockReceipt({
        items: [{ name: 'Bad Item', quantity: 2, unitPrice: 10, totalPrice: 50, category: 'groceries' }], // 2*10=20 != 50
        total: 50,
      });
      const score = calculateReceiptIntegrity(receipt);
      expect(score).toBeLessThan(100);
    });
  });

  describe('isIntegrityAcceptable', () => {
    it('returns true for score >= threshold', () => {
      expect(isIntegrityAcceptable(INTEGRITY_THRESHOLD)).toBe(true);
      expect(isIntegrityAcceptable(100)).toBe(true);
    });

    it('returns false for score < threshold', () => {
      expect(isIntegrityAcceptable(INTEGRITY_THRESHOLD - 1)).toBe(false);
      expect(isIntegrityAcceptable(0)).toBe(false);
    });
  });
});
