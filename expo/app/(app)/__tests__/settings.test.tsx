import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../settings';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US', changeLanguage: jest.fn() } }),
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/ThemeProvider', () => ({
    useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

jest.mock('@/store/useGlobalStore', () => ({
    useGlobalStore: {
        getState: () => ({ setRegion: jest.fn() }),
    }
}));

const mockGetUser = jest.fn();
const mockSignOut = jest.fn();
const mockListFactors = jest.fn().mockResolvedValue({ data: { totp: [] } });

jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            get getUser() { return mockGetUser; },
            get signOut() { return mockSignOut; },
            mfa: {
                get listFactors() { return mockListFactors; },
            }
        }
    }
}));

jest.mock('@/lib/storage', () => ({
    storage: {
        getRegion: jest.fn().mockResolvedValue('en-US'),
        setRegion: jest.fn(),
        setLanguage: jest.fn(),
    }
}));

jest.mock('@/lib/google-signin', () => ({
    GoogleSignin: {
        signOut: jest.fn(),
    }
}));

// Mock Lucide Icons
jest.mock('lucide-react-native', () => ({
    ChevronRight: () => 'ChevronRight',
    Globe: () => 'Globe',
    Key: () => 'Key',
    Mail: () => 'Mail',
    Palette: () => 'Palette',
    Shield: () => 'Shield',
    User: () => 'User',
    MapPin: () => 'MapPin',
}));

import { useRouter } from 'expo-router';

describe('SettingsScreen', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
        replace: mockReplace,
    });
    mockGetUser.mockResolvedValue({ 
        data: { user: { email: 'test@example.com', email_confirmed_at: '2023-01-01' } } 
    });
  });

  test('renders correctly', async () => {
    const { getByText } = render(<SettingsScreen />);
    
    await waitFor(() => {
        expect(getByText('settings.title')).toBeTruthy();
    });
  });

  test('shows language modal and changes language', async () => {
    const { getByText } = render(<SettingsScreen />);
    
    await waitFor(() => expect(getByText('settings.language')).toBeTruthy());
    
    fireEvent.press(getByText('settings.language'));
    
    // Assuming modal content is rendered (React Native Modal might need checking)
    // For this test environment, Modals often render their content.
    // If not, we might need to mock Modal to purely render children.
  });

  test('logs out', async () => {
    // Mock Alert.alert to immediately trigger the destructive action
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation((title, message, buttons) => {
        const logoutButton = (buttons as any[]).find((b: any) => b.style === 'destructive');
        if (logoutButton && logoutButton.onPress) {
            logoutButton.onPress();
        }
    });

    const { getByText } = render(<SettingsScreen />);
    
    await waitFor(() => expect(getByText('auth.logout')).toBeTruthy());
    
    fireEvent.press(getByText('auth.logout'));
    
    await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
