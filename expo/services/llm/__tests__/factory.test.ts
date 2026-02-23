// Mock OpenRouterProvider before importing
jest.mock('../OpenRouterProvider', () => ({
  OpenRouterProvider: jest.fn().mockImplementation(() => ({
    analyzeReceipt: jest.fn(),
  })),
}));

import { getLLMProvider } from '../factory';
import { OpenRouterProvider } from '../OpenRouterProvider';

describe('llm/factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_LLM_PROVIDER = 'openrouter';
  });

  it('returns a provider with analyzeReceipt method', () => {
    const provider = getLLMProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.analyzeReceipt).toBe('function');
  });

  it('creates OpenRouterProvider instance', () => {
    getLLMProvider();
    expect(OpenRouterProvider).toHaveBeenCalled();
  });
});
