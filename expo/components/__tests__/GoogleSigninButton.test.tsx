import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GoogleSigninButton } from '../GoogleSigninButton';
import { GoogleSignin, isNativeModuleAvailable } from '@/lib/google-signin';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isNativeModuleAvailable: true,
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
    },
  },
}));

// Spy on Alert
jest.spyOn(Alert, 'alert');

describe('GoogleSigninButton', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
    // Default happy path mocks
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      data: { idToken: 'valid-token' }
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });
  });

  it('renders correctly', () => {
    const { getByText } = render(<GoogleSigninButton />);
    expect(getByText('auth.continueWithGoogle')).toBeTruthy();
  });

  it('handles successful sign in', async () => {
    const { getByText } = render(<GoogleSigninButton />);
    
    fireEvent.press(getByText('auth.continueWithGoogle'));

    await waitFor(() => {
        expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
        expect(GoogleSignin.signIn).toHaveBeenCalled();
        expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
            provider: 'google',
            token: 'valid-token'
        });
        expect(mockReplace).toHaveBeenCalledWith('/(app)');
    });
  });

  it('shows alert if native module is not available', async () => {
    // Override mock for this test
    jest.requireMock('@/lib/google-signin').isNativeModuleAvailable = false;
    
    const { getByText } = render(<GoogleSigninButton />);
    fireEvent.press(getByText('auth.continueWithGoogle'));

    await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
            'Google Sign-In Unavailable',
            expect.stringContaining('development build')
        );
    });

    // Reset mock
    jest.requireMock('@/lib/google-signin').isNativeModuleAvailable = true;
  });

  it('handles user cancellation gracefully', async () => {
    (GoogleSignin.signIn as jest.Mock).mockRejectedValue({
        code: 'SIGN_IN_CANCELLED'
    });

    const { getByText } = render(<GoogleSigninButton />);
    fireEvent.press(getByText('auth.continueWithGoogle'));

    // Should NOT alert or redirect
    await waitFor(() => expect(GoogleSignin.signIn).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('handles Play Services unavailable', async () => {
     (GoogleSignin.signIn as jest.Mock).mockRejectedValue({
        code: 'PLAY_SERVICES_NOT_AVAILABLE'
    });

    const { getByText } = render(<GoogleSigninButton />);
    fireEvent.press(getByText('auth.continueWithGoogle'));

    await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
            'Play Services Unavailable',
            expect.anything()
        );
    });
  });

  it('handles generic errors', async () => {
    (GoogleSignin.signIn as jest.Mock).mockRejectedValue(new Error('Random failure'));

    const { getByText } = render(<GoogleSigninButton />);
    fireEvent.press(getByText('auth.continueWithGoogle'));

    await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
            'Sign-In Error',
            'Random failure'
        );
    });
  });
});
