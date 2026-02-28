// OpenRouter model identifiers (with provider prefix)
// Performance & Cost Guide (approximate, per 1M tokens):
// - Gemini 2.5 Flash: ~$0.15-0.20/M input, ~$0.60/M output → ~8,900 requests/$5 (BEST VALUE)
// - Claude 3.5 Haiku: ~$0.15/M input, ~$0.60/M output → ~8,900 requests/$5 (excellent instruction following)
// - GPT-4o Mini: ~$0.15/M input, ~$0.60/M output → ~8,900 requests/$5 (strong all-rounder)
// - Gemini 2.5 Flash Lite: ~$0.075/M input, ~$0.30/M output → ~17,800 requests/$5 (budget, lower accuracy)
// - Gemini 2.0 Flash: ~$0.20/M input, ~$0.80/M output → ~6,600 requests/$5 (legacy, deprecated March 2026)
//
// Recommendation: Use google/gemini-2.5-flash as default. It offers the best balance of
// accuracy and cost for receipt extraction. The enhanced prompt (Label Association, Horizontal
// Priority) helps all models, but Gemini 2.5 Flash handles spatial layout reasoning best.
//
// If issues arise, test alternatives in this order:
// 1. anthropic/claude-3.5-haiku (if you need maximum instruction adherence)
// 2. openai/gpt-4o-mini (if you prefer OpenAI ecosystem)
// 3. google/gemini-2.5-flash-lite (only if cost is absolute priority and accuracy can suffer)
export const OPENROUTER_GEMINI_MODELS = [
  '',
  'google/gemini-2.5-flash', // DEFAULT - best value for multimodal receipt extraction
  'anthropic/claude-3.5-haiku', // alternative: excellent at structured extraction
  'openai/gpt-4o-mini', // alternative: good all-rounder, competitive pricing
  'google/gemini-2.5-flash-lite', // budget option: bad accuracy, 2x cheaper (DO NOT USE it hallucinates on bad quality imgs)
  'google/gemini-2.0-flash-001' // legacy: deprecated March 2026, keep as fallback
] as const;

export type OpenRouterGeminiModel = (typeof OPENROUTER_GEMINI_MODELS)[number];

export const DEFAULT_OPENROUTER_MODEL: OpenRouterGeminiModel = OPENROUTER_GEMINI_MODELS[0];
