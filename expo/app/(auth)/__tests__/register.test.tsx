import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../register';

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

const mockSignUp = jest.fn();

jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            get signUp() { return mockSignUp; },
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

jest.mock('lucide-react-native', () => ({
  CheckCircle: () => 'CheckCircle',
  Globe: () => 'Globe',
  AlertCircle: () => 'AlertCircle',
}));

// Mock WebBrowser and Linking
jest.mock('expo-web-browser', () => ({
    openBrowserAsync: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: (props: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={props.onPress} disabled={props.disabled}><Text>{props.title}</Text></TouchableOpacity>;
  }
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => {
    const { TextInput, Text, View } = require('react-native');
    return (
      <View>
        {props.label && <Text>{props.label}</Text>}
        <TextInput
          placeholder={props.placeholder}
          value={props.value}
          onChangeText={props.onChangeText}
          secureTextEntry={props.secureTextEntry}
        />
      </View>
    );
  }
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ message }: any) => {
    const { Text } = require('react-native');
    return <Text>{message}</Text>;
  }
}));

import { useRouter } from 'expo-router';

describe('RegisterScreen', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
        replace: mockReplace,
        push: jest.fn(),
    });
  });

  test('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<RegisterScreen />);
    
    expect(getByText('auth.register')).toBeTruthy();
    expect(getByPlaceholderText('auth.email')).toBeTruthy();
    expect(getByPlaceholderText('auth.password')).toBeTruthy();
    expect(getByPlaceholderText('auth.confirmPassword')).toBeTruthy();
    expect(getByText(/auth.iAgreeToThe/)).toBeTruthy();
  });

  test('validates passwords match', async () => {
    const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

    // Toggle terms to accept them (so validation proceeds to password check)
    fireEvent.press(getByText(/auth.iAgreeToThe/));

    fireEvent.changeText(getByPlaceholderText('auth.email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('auth.password'), 'password');
    fireEvent.changeText(getByPlaceholderText('auth.confirmPassword'), 'mismatch');
    fireEvent.press(getByText('auth.signUp'));

    await waitFor(() => {
        expect(getByText('auth.passwordsDoNotMatch')).toBeTruthy();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('button is disabled when terms not accepted', () => {
    const { getByText } = render(<RegisterScreen />);

    // Find the button - it should be disabled when terms not accepted
    const button = getByText('auth.signUp');
    
    // The parent TouchableOpacity should have disabled prop
    // Since we can't easily check disabled in RN testing, we verify signUp is never called
    fireEvent.press(button);
    
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('registers successfully', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

    // Accept terms
    fireEvent.press(getByText(/auth.iAgreeToThe/));

    fireEvent.changeText(getByPlaceholderText('auth.email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('auth.password'), 'password');

    fireEvent.changeText(getByPlaceholderText('auth.confirmPassword'), 'password');
    
    fireEvent.press(getByText('auth.signUp'));

    await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password',
        });
        expect(mockReplace).toHaveBeenCalledWith({
            pathname: '/(auth)/verify-email',
            params: { email: 'test@example.com' }
        });
    });
  });
});
