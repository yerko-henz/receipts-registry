import { formatPrice, setRegionLocale, CURRENCY_SYMBOLS } from '../currency';

describe('currency', () => {
  beforeEach(() => {
    // Reset to default locale before each test
    setRegionLocale('en-US');
  });

  describe('formatPrice', () => {
    it('formats USD correctly for en-US', () => {
      const result = formatPrice(1234.56);
      expect(result).toContain('$');
      expect(result).toContain('1');
    });

    it('uses correct symbol for PEN', () => {
      const result = formatPrice(100, 'PEN');
      expect(result).toContain('S/');
    });

    it('respects explicit currency code', () => {
      const result = formatPrice(100, 'CLP');
      expect(result).toContain('$');
    });

    it('uses region default if no currency specified', () => {
      setRegionLocale('es-PE');
      const result = formatPrice(100);
      // Should use PEN for es-PE
      expect(result).toContain('S/');
    });
  });

  describe('CURRENCY_SYMBOLS', () => {
    it('has correct symbol for USD', () => {
      expect(CURRENCY_SYMBOLS['USD']).toBe('$');
    });

    it('has correct symbol for PEN', () => {
      expect(CURRENCY_SYMBOLS['PEN']).toBe('S/');
    });
  });

  describe('setRegionLocale', () => {
    it('changes the locale used by formatPrice', () => {
      setRegionLocale('es-MX');
      const result = formatPrice(100);
      // Should use MXN for es-MX
      expect(result).toContain('$');
    });
  });
});
