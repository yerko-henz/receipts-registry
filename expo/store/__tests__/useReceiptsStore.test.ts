import { useReceiptsStore } from '../useReceiptsStore';

// Mock the dependencies
jest.mock('@/services/receipts', () => ({
  getReceiptsByUserId: jest.fn(),
  createReceipt: jest.fn(),
  deleteReceipt: jest.fn(),
}));

jest.mock('../useGlobalStore', () => ({
  useGlobalStore: {
    getState: jest.fn(() => ({ user: { id: 'test-user' } })),
  }
}));

describe('useReceiptsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useReceiptsStore.setState({
      receipts: [],
      isLoading: false,
      error: null,
      page: 1,
      hasMore: true,
      totalCount: 0,
      filters: { category: 'All', searchQuery: '', dateMode: 'created' }
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty receipts', () => {
      expect(useReceiptsStore.getState().receipts).toEqual([]);
    });

    it('starts with isLoading false', () => {
      expect(useReceiptsStore.getState().isLoading).toBe(false);
    });

    it('has default filters', () => {
      expect(useReceiptsStore.getState().filters.category).toBe('All');
      expect(useReceiptsStore.getState().filters.dateMode).toBe('created');
    });
  });

  describe('actions.setFilters', () => {
    it('updates filters partially', () => {
      useReceiptsStore.getState().actions.setFilters({ category: 'Food' });
      expect(useReceiptsStore.getState().filters.category).toBe('Food');
      expect(useReceiptsStore.getState().filters.searchQuery).toBe(''); // unchanged
    });
  });
});
