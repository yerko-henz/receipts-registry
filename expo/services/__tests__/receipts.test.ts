import { getReceiptsByUserId, ReceiptFilters } from '../receipts';
import { supabase } from '../../lib/supabase';

// Mock Supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
        from: jest.fn()
    }
  },
  uploadFile: jest.fn()
}));

describe('Receipts Service', () => {
  describe('getReceiptsByUserId', () => {
    test('fetches receipts with simple pagination', async () => {
      const mockSelect = jest.fn();
      const mockEq = jest.fn();
      const mockOrder = jest.fn();
      const mockRange = jest.fn();
      
      // Chain setup
      (supabase.from as jest.Mock).mockReturnValue({
          select: mockSelect
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder }); // Assuming no filters skip straight to order? 
      // Actually the code does logic. 
      // chain: select -> eq('user_id') -> ... filters ... -> order -> range
      
      // Let's refine the mock to return "this" or a chainable object
      const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ 
              data: [{ id: '1', image_url: 'path/to/img' }], 
              error: null, 
              count: 10 
          })
      };
      
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      // Mock storage signing to return same data for simplicity
      // The service calls signReceiptImages which calls supabase.storage...
      // We need to mock that too.
      const mockStorageFrom = {
          createSignedUrls: jest.fn().mockResolvedValue({
              data: [{ path: 'path/to/img', signedUrl: 'signed-url' }],
              error: null
          })
      };
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageFrom);

      const result = await getReceiptsByUserId('user-123', 1, 20);

      expect(supabase.from).toHaveBeenCalledWith('receipts');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockChain.range).toHaveBeenCalledWith(0, 19);
      expect(result.data[0].image_url).toBe('signed-url');
    });
    
    test('applies category filter', async () => {
        const mockChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], count: 0 })
        };
        (supabase.from as jest.Mock).mockReturnValue(mockChain);
        
        await getReceiptsByUserId('u1', 1, 20, { category: 'Food' });
        
        // eq user_id, eq category
        expect(mockChain.eq).toHaveBeenCalledWith('category', 'Food');
    });
  });
});
