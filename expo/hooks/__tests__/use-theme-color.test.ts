import { renderHook } from '@testing-library/react-native';
import { useThemeColor } from '../use-theme-color';
import { useColorScheme } from '../use-color-scheme';
import { Colors } from '@/constants/theme';

jest.mock('../use-color-scheme', () => ({
  useColorScheme: jest.fn(),
}));

describe('useThemeColor', () => {
  it('should return color from props if provided', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');
    const { result } = renderHook(() => useThemeColor({ light: '#123' }, 'background'));
    expect(result.current).toBe('#123');
  });

  it('should return color from theme if not in props (light)', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');
    const { result } = renderHook(() => useThemeColor({}, 'primary'));
    expect(result.current).toBe(Colors.light.primary);
  });

  it('should return color from theme if not in props (dark)', () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    const { result } = renderHook(() => useThemeColor({}, 'primary'));
    expect(result.current).toBe(Colors.dark.primary);
  });
  
  it('should default to light if theme is undefined', () => {
    (useColorScheme as jest.Mock).mockReturnValue(undefined);
    const { result } = renderHook(() => useThemeColor({}, 'primary'));
    expect(result.current).toBe(Colors.light.primary);
  });
});
