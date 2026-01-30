// Mock GeminiProvider before importing
jest.mock('../GeminiProvider', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    analyzeReceipt: jest.fn(),
  })),
}));

import { getLLMProvider } from '../factory';
import { GeminiProvider } from '../GeminiProvider';

describe('llm/factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a provider with analyzeReceipt method', () => {
    const provider = getLLMProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.analyzeReceipt).toBe('function');
  });

  it('creates GeminiProvider instance', () => {
    getLLMProvider();
    expect(GeminiProvider).toHaveBeenCalled();
  });
});
