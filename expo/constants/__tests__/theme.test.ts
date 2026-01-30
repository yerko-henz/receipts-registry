import { Colors, Fonts } from '../theme';

describe('theme', () => {
  describe('Colors', () => {
    it('has primary color', () => {
      expect(Colors.primary).toBeDefined();
    });

    it('has light and dark modes', () => {
      expect(Colors.light).toBeDefined();
      expect(Colors.dark).toBeDefined();
    });

    it('light mode has required properties', () => {
      expect(Colors.light.text).toBeDefined();
      expect(Colors.light.background).toBeDefined();
      expect(Colors.light.tint).toBeDefined();
    });

    it('dark mode has required properties', () => {
      expect(Colors.dark.text).toBeDefined();
      expect(Colors.dark.background).toBeDefined();
      expect(Colors.dark.tint).toBeDefined();
    });
  });

  describe('Fonts', () => {
    it('is defined', () => {
      expect(Fonts).toBeDefined();
    });
  });
});
