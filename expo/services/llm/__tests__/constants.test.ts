import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from '../constants';

describe('llm/constants', () => {
  it('GEMINI_MODELS is an array of model names', () => {
    expect(Array.isArray(GEMINI_MODELS)).toBe(true);
    expect(GEMINI_MODELS.length).toBeGreaterThan(0);
  });

  it('DEFAULT_GEMINI_MODEL is the first model', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe(GEMINI_MODELS[0]);
  });

  it('all models are strings', () => {
    GEMINI_MODELS.forEach(model => {
      expect(typeof model).toBe('string');
    });
  });
});
