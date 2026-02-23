export const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

export const DEFAULT_GEMINI_MODEL: GeminiModel = GEMINI_MODELS[0];

// OpenRouter model identifiers (with provider prefix)
export const OPENROUTER_GEMINI_MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-1.5-flash",
  "google/gemini-1.5-pro",
] as const;

export type OpenRouterGeminiModel = (typeof OPENROUTER_GEMINI_MODELS)[number];

export const DEFAULT_OPENROUTER_MODEL: OpenRouterGeminiModel =
  OPENROUTER_GEMINI_MODELS[0];
