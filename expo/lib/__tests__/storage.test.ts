import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Language', () => {
    it('should get language', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('en-US');
      const result = await storage.getLanguage();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_language');
      expect(result).toBe('en-US');
    });

    it('should set language', async () => {
      await storage.setLanguage('es-CL');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_language', 'es-CL');
    });
  });

  describe('Theme', () => {
    it('should get theme', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
        const result = await storage.getTheme();
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_theme');
        expect(result).toBe('dark');
    });

    it('should set theme', async () => {
        await storage.setTheme('light');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_theme', 'light');
    });
  });

  describe('Region', () => {
    it('should get region', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('CL');
        const result = await storage.getRegion();
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_region');
        expect(result).toBe('CL');
    });

    it('should set region', async () => {
        await storage.setRegion('US');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_region', 'US');
    });
  });
});
