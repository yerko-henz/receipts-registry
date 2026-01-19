import { ReceiptAnalysisProvider } from "./types";
import { GeminiProvider } from "./GeminiProvider";
import { DEFAULT_GEMINI_MODEL } from "./constants";

export const getLLMProvider = (): ReceiptAnalysisProvider => {
  const providerType = process.env.EXPO_PUBLIC_LLM_PROVIDER || 'gemini';

  switch (providerType.toLowerCase()) {
    case 'gemini':
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
      if (!apiKey) {
          console.warn("EXPO_PUBLIC_GEMINI_API_KEY is not set.");
      }
      return new GeminiProvider(apiKey, DEFAULT_GEMINI_MODEL);
    
    // Future providers can be added here
    // case 'openai':
    //   return new OpenAIProvider(...);

    default:
      throw new Error(`Unsupported LLM provider: ${providerType}. Please check your EXPO_PUBLIC_LLM_PROVIDER environment variable.`);
  }
};
