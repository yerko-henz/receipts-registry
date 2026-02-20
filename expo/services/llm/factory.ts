import { ReceiptAnalysisProvider } from "./types";
import { OpenRouterProvider } from "./OpenRouterProvider";
import { DEFAULT_OPENROUTER_MODEL } from "./constants";

export const getLLMProvider = (model?: string): ReceiptAnalysisProvider => {
  const providerType = process.env.EXPO_PUBLIC_LLM_PROVIDER || 'openrouter';

  switch (providerType.toLowerCase()) {
    case 'openrouter':
      const openRouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
      if (!openRouterKey) {
          console.warn("EXPO_PUBLIC_OPENROUTER_API_KEY is not set.");
      }
      return new OpenRouterProvider(openRouterKey, model || DEFAULT_OPENROUTER_MODEL);

    default:
      // Default to OpenRouter for all cases to support all models via proxy
      const defaultKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
      return new OpenRouterProvider(defaultKey, model || DEFAULT_OPENROUTER_MODEL);
  }
};
