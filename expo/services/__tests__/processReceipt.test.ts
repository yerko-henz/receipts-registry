import { analyzeReceipt } from '../processReceipt';
import { getLLMProvider } from '../llm/factory';

jest.mock('../llm/factory', () => ({
  getLLMProvider: jest.fn(),
}));

describe('processReceipt', () => {
  const mockAnalyzeReceipt = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getLLMProvider as jest.Mock).mockReturnValue({
      analyzeReceipt: mockAnalyzeReceipt,
    });
  });

  describe('analyzeReceipt', () => {
    it('calls LLM provider with base64 image', async () => {
      const mockData = { merchantName: 'Test', total: 100, items: [], date: '2024-01-01' };
      mockAnalyzeReceipt.mockResolvedValue(mockData);

      const result = await analyzeReceipt('base64-image-data');

      expect(getLLMProvider).toHaveBeenCalled();
      expect(mockAnalyzeReceipt).toHaveBeenCalledWith('base64-image-data');
      expect(result).toBe(mockData);
    });

    it('propagates errors from provider', async () => {
      mockAnalyzeReceipt.mockRejectedValue(new Error('API Error'));

      await expect(analyzeReceipt('image')).rejects.toThrow('API Error');
    });
  });
});
