/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#1ab8a0';
const tintColorDark = '#1ab8a0';

export const Colors = {
  primary: '#1ab8a0',
  secondary: '#f9874b',
  light: {
    primary: '#1ab8a0',
    secondary: '#f9874b',
    text: '#1e293b', // Keeping light theme text readable on light background
    background: '#f8fafc',
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorLight,
    card: '#ffffff',
    border: '#e2e8f0',
    notification: '#ef4444',
  },
  dark: {
    primary: '#1ab8a0',
    secondary: '#f9874b',
    text: '#d8d9d3',
    background: '#131516',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    card: '#1C1E1F', // Slightly lighter than background for card distinction
    border: '#2A2C2E',
    notification: '#ff453a',
  },

};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'Manrope_400Regular',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'Manrope_400Regular',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'Manrope_400Regular',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'Manrope_400Regular',
  },
  default: {
    sans: 'Manrope_400Regular',
    serif: 'Manrope_400Regular',
    rounded: 'Manrope_400Regular',
    mono: 'Manrope_400Regular',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
