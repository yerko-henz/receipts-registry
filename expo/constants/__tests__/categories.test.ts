import { RECEIPT_CATEGORIES, getCategoryIcon, DEFAULT_CATEGORY_ICON, CATEGORY_ICONS } from '../categories';

describe('categories', () => {
  describe('RECEIPT_CATEGORIES', () => {
    it('contains expected categories', () => {
      expect(RECEIPT_CATEGORIES).toContain('Food');
      expect(RECEIPT_CATEGORIES).toContain('Transport');
      expect(RECEIPT_CATEGORIES).toContain('Other');
    });

    it('has at least 5 categories', () => {
      expect(RECEIPT_CATEGORIES.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getCategoryIcon', () => {
    it('returns correct icon for known category', () => {
      expect(getCategoryIcon('Food')).toBe(CATEGORY_ICONS.Food);
    });

    it('returns default icon for unknown category', () => {
      expect(getCategoryIcon('UnknownCategory')).toBe(DEFAULT_CATEGORY_ICON);
    });
  });
});
