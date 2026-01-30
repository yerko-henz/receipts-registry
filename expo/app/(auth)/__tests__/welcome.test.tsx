import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WelcomeScreen from '../welcome';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) => <>{children}</>,
}));

jest.mock('expo-linear-gradient', () => ({
    LinearGradient: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react-native', () => ({
    Globe: () => 'Globe',
    ArrowRight: () => 'ArrowRight',
}));

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    ...jest.requireActual('react-native-reanimated/mock'),
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    default: {
      View,
    },
  };
});

jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    selectionAsync: jest.fn(),
    ImpactFeedbackStyle: { Light: 'Light' },
}));

jest.mock('expo-localization', () => ({
    getLocales: () => [{ currencyCode: 'USD' }],
}));

import { useRouter } from 'expo-router';

describe('WelcomeScreen', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
        push: mockPush,
    });
  });

  test('renders company name', () => {
    const { getByText } = render(<WelcomeScreen />);
    
    // Default company name or env var
    expect(getByText(/Acme Corp|Company/i)).toBeTruthy();
  });

  test('renders first slide content', () => {
    const { getByText } = render(<WelcomeScreen />);
    
    // First slide text
    expect(getByText(/Welcome to our platform/i)).toBeTruthy();
  });

  test('renders Skip button', () => {
    const { getByText } = render(<WelcomeScreen />);
    
    expect(getByText('Skip')).toBeTruthy();
  });

  test('tapping Skip navigates to login', () => {
    const { getByText } = render(<WelcomeScreen />);
    
    fireEvent.press(getByText('Skip'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });
});
