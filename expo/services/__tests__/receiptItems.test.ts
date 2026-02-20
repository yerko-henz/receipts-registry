import { getReceiptItems, deleteReceiptItem } from '../receiptItems';

// Mock supabase
const mockSelect = jest.fn();
const mockFrom = jest.fn((_table: string) => ({
  select: mockSelect,
  delete: jest.fn(() => ({
    eq: jest.fn().mockResolvedValue({ error: null })
  }))
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table)
  }
}));

describe('receiptItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null })
    });
  });

  describe('getReceiptItems', () => {
    it('queries receipt_items table with receipt_id', async () => {
      await getReceiptItems('receipt-123');
      
      expect(mockFrom).toHaveBeenCalledWith('receipt_items');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('returns data from supabase', async () => {
      const mockData = [{ id: 1, name: 'Item 1' }];
      mockSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockData, error: null })
      });

      const result = await getReceiptItems('receipt-123');
      expect(result).toEqual(mockData);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: new Error('DB Error') })
      });

      await expect(getReceiptItems('receipt-123')).rejects.toThrow('DB Error');
    });
  });
});
