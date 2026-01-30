import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from '../use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

jest.mock('@/components/ThemeProvider', () => ({
  useTheme: jest.fn(),
}));

describe('useColorScheme', () => {
    it('should return active theme', () => {
        (useTheme as jest.Mock).mockReturnValue({ activeTheme: 'dark' });
        const { result } = renderHook(() => useColorScheme());
        expect(result.current).toBe('dark');
    });

    it('should return light by default if mocked that way', () => {
        (useTheme as jest.Mock).mockReturnValue({ activeTheme: 'light' });
        const { result } = renderHook(() => useColorScheme());
        expect(result.current).toBe('light');
    });
});
