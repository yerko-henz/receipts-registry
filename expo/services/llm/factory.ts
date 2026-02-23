import { ReceiptAnalysisProvider } from "./types";
import { GeminiProvider } from "./GeminiProvider";
import { OpenRouterProvider } from "./OpenRouterProvider";
import { DEFAULT_GEMINI_MODEL, DEFAULT_OPENROUTER_MODEL } from "./constants";

export const getLLMProvider = (): ReceiptAnalysisProvider => {
  const providerType = process.env.EXPO_PUBLIC_LLM_PROVIDER || "gemini";

  switch (providerType.toLowerCase()) {
    case "gemini":
      const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
      if (!geminiKey) {
        console.warn("EXPO_PUBLIC_GEMINI_API_KEY is not set.");
      }
      return new GeminiProvider(geminiKey, DEFAULT_GEMINI_MODEL);

    case "openrouter":
      const openRouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";
      if (!openRouterKey) {
        console.warn("EXPO_PUBLIC_OPENROUTER_API_KEY is not set.");
      }
      return new OpenRouterProvider(openRouterKey, DEFAULT_OPENROUTER_MODEL);

    // Future providers can be added here
    // case 'openai':
    //   return new OpenAIProvider(...);

    default:
      throw new Error(
        `Unsupported LLM provider: ${providerType}. Please check your EXPO_PUBLIC_LLM_PROVIDER environment variable.`,
      );
  }
};
