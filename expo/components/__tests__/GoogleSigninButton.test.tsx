import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GoogleSigninButton } from '../GoogleSigninButton';
import { GoogleSignin, isNativeModuleAvailable } from '@/lib/google-signin';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useAlertStore } from '@/store/useAlertStore';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

const mockShowAlert = jest.fn();
jest.mock('@/store/useAlertStore', () => ({
  useAlertStore: jest.fn(),
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
    (useAlertStore as unknown as jest.Mock).mockImplementation((selector) => 
      selector({ showAlert: mockShowAlert })
    );
    // Default happy path mocks
    (GoogleSignin!.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin!.signIn as jest.Mock).mockResolvedValue({
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
        expect(GoogleSignin!.hasPlayServices).toHaveBeenCalled();
        expect(GoogleSignin!.signIn).toHaveBeenCalled();
        expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
            provider: 'google',
            token: 'valid-token'
        });
        expect(mockReplace).toHaveBeenCalledWith('/(app)');
    });
  });

  it('shows alert if native module is not available', async () => {
    // Override mock for this test
    const googleSigninLib = require('@/lib/google-signin');
    googleSigninLib.isNativeModuleAvailable = false;
    
    const { getByText } = render(<GoogleSigninButton />);
    fireEvent.press(getByText('auth.continueWithGoogle'));

    await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
            'auth.googleSigninUnavailable',
            'auth.googleSigninUnavailableDesc'
        );
    });

    // Reset mock
    googleSigninLib.isNativeModuleAvailable = true;
  });

  it('handles user cancellation gracefully', async () => {
    (GoogleSignin!.signIn as jest.Mock).mockRejectedValue({
        code: 'SIGN_IN_CANCELLED'
    });

    const { getByText } = render(<GoogleSigninButton />);
    fireEvent.press(getByText('auth.continueWithGoogle'));

    // Should NOT alert or redirect
    await waitFor(() => expect(GoogleSignin!.signIn).toHaveBeenCalled());
    expect(mockShowAlert).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('handles Play Services unavailable', async () => {
     (GoogleSignin!.signIn as jest.Mock).mockRejectedValue({
        code: 'PLAY_SERVICES_NOT_AVAILABLE'
    });

    const { getByText } = render(<GoogleSigninButton />);
    fireEvent.press(getByText('auth.continueWithGoogle'));

    await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
            'auth.playServicesUnavailable',
            'auth.playServicesUnavailableDesc'
        );
    });
  });

  it('handles generic errors', async () => {
    (GoogleSignin!.signIn as jest.Mock).mockRejectedValue(new Error('Random failure'));

    const { getByText } = render(<GoogleSigninButton />);
    fireEvent.press(getByText('auth.continueWithGoogle'));

    await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
            'auth.signinError',
            'Random failure'
        );
    });
  });
});
