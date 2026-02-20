import { OPENROUTER_MODELS, DEFAULT_OPENROUTER_MODEL } from '../constants';

describe('llm/constants', () => {
  it('OPENROUTER_MODELS is an array of model names', () => {
    expect(Array.isArray(OPENROUTER_MODELS)).toBe(true);
    expect(OPENROUTER_MODELS.length).toBeGreaterThan(0);
  });

  it('DEFAULT_OPENROUTER_MODEL is the first model', () => {
    expect(DEFAULT_OPENROUTER_MODEL).toBe(OPENROUTER_MODELS[0]);
  });

  it('all models are strings', () => {
    OPENROUTER_MODELS.forEach((model: string) => {
      expect(typeof model).toBe('string');
    });
  });
});
