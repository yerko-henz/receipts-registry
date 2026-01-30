import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../languages';

describe('languages', () => {
  it('SUPPORTED_LANGUAGES contains at least 2 languages', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(2);
  });

  it('DEFAULT_LANGUAGE is defined', () => {
    expect(DEFAULT_LANGUAGE).toBeDefined();
    expect(typeof DEFAULT_LANGUAGE).toBe('string');
  });

  it('each language has required properties', () => {
    SUPPORTED_LANGUAGES.forEach(lang => {
      expect(lang.code).toBeDefined();
      expect(lang.label).toBeDefined();
      expect(lang.i18nKey).toBeDefined();
    });
  });
});
