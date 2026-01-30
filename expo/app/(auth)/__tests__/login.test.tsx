import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../login';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', changeLanguage: jest.fn() } }),
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) => <>{children}</>,
}));

const mockSignInWithPassword = jest.fn();
const mockGetAuthenticatorAssuranceLevel = jest.fn();

jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            get signInWithPassword() { return mockSignInWithPassword; },
            mfa: {
                get getAuthenticatorAssuranceLevel() { return mockGetAuthenticatorAssuranceLevel; },
            }
        }
    }
}));

jest.mock('@/lib/storage', () => ({
    storage: {
        setLanguage: jest.fn(),
    }
}));

jest.mock('@/components/GoogleSigninButton', () => ({
    GoogleSigninButton: () => 'GoogleSigninButton'
}));

jest.mock('@/components/ui/button', () => ({
  Button: (props: any) => {
      const { Text, TouchableOpacity } = require('react-native');
      return <TouchableOpacity onPress={props.onPress}><Text>{props.title}</Text></TouchableOpacity>;
  }
}));

import { useRouter } from 'expo-router';

describe('LoginScreen', () => {
  const mockReplace = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
        replace: mockReplace,
        push: mockPush,
    });
  });

  test('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    
    expect(getByText('auth.login')).toBeTruthy();
    expect(getByPlaceholderText('auth.email')).toBeTruthy();
    expect(getByPlaceholderText('auth.password')).toBeTruthy();
  });

  test('navigates to dashboard on successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({ 
        data: { nextLevel: 'aal1', currentLevel: 'aal1' } 
    });

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('auth.email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('auth.password'), 'password');
    fireEvent.press(getByText('auth.signIn'));

    await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalled();
    });

    await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(app)');
    }, { timeout: 3000 });
  });

  test('displays error on login failure', async () => {
    const errorMsg = 'Invalid credentials';
    mockSignInWithPassword.mockResolvedValue({ error: { message: errorMsg } });

    const { getByText, getByPlaceholderText, debug } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('auth.email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('auth.password'), 'wrong');
    fireEvent.press(getByText('auth.signIn'));

    await waitFor(() => {
       expect(mockSignInWithPassword).toHaveBeenCalled();
    });

    await waitFor(() => {
        try {
            expect(getByText(errorMsg)).toBeTruthy();
        } catch (e) {
            debug(); // Print tree if expectation fails
            throw e;
        }
    });
    
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
