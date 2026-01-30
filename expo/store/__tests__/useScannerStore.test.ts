import { useScannerStore } from '../useScannerStore';

// Mock the dependencies
jest.mock('@/services/processReceipt', () => ({
  analyzeReceipt: jest.fn(),
}));

jest.mock('@/services/receiptIntegrity', () => ({
  isIntegrityAcceptable: jest.fn(() => true),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(() => 'mock-base64'),
}));

describe('useScannerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useScannerStore.setState({
      items: [],
      isScanning: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty items', () => {
      expect(useScannerStore.getState().items).toEqual([]);
    });

    it('starts with isScanning false', () => {
      expect(useScannerStore.getState().isScanning).toBe(false);
    });
  });

  describe('resetScanner', () => {
    it('clears all items', () => {
      useScannerStore.setState({
        items: [{ id: '1', uri: 'test', status: 'completed' }]
      });
      
      useScannerStore.getState().resetScanner();
      
      expect(useScannerStore.getState().items).toEqual([]);
    });
  });
});
