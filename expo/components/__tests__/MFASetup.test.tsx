import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MFASetup } from '../MFASetup';

jest.mock('@/components/ui/alert', () => ({ Alert: () => 'Alert' }));
jest.mock('@/components/ui/button', () => ({ Button: (props: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={props.onPress}><Text>{props.title}</Text></TouchableOpacity>;
}}));
jest.mock('@/components/ui/card', () => ({ Card: ({children}: any) => <>{children}</> }));
jest.mock('@/components/ui/input', () => ({ Input: (props: any) => {
    const { TextInput } = require('react-native');
    return <TextInput {...props} />;
}}));

// Mocks
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('lucide-react-native', () => ({
    CheckCircle: () => 'CheckCircle',
    Shield: () => 'Shield',
    Trash2: () => 'Trash2',
    Copy: () => 'Copy',
    Check: () => 'Check',
}));

jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('expo-clipboard', () => ({
    setStringAsync: jest.fn(),
}));

const mockListFactors = jest.fn();
const mockEnroll = jest.fn();
const mockChallenge = jest.fn();
const mockVerify = jest.fn();
const mockUnenroll = jest.fn();

jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            mfa: {
                listFactors: mockListFactors,
                enroll: mockEnroll,
                challenge: mockChallenge,
                verify: mockVerify,
                unenroll: mockUnenroll,
            }
        }
    }
}));

describe.skip('MFASetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListFactors.mockResolvedValue({ 
        data: { all: [] }, 
        error: null 
    });
  });

  test('renders empty state correctly', async () => {
    const { getByText } = render(<MFASetup />);
    
    await waitFor(() => {
        expect(getByText('settings.mfa')).toBeTruthy();
        expect(getByText('mfa.infoNoFactors')).toBeTruthy();
    });
  });

  test('renders list of factors', async () => {
    mockListFactors.mockResolvedValue({ 
        data: { 
            all: [
                { id: '1', friendly_name: 'My iPhone', status: 'verified', created_at: '2023-01-01' }
            ] 
        }, 
        error: null 
    });

    const { getByText } = render(<MFASetup />);
    
    await waitFor(() => {
        expect(getByText(/My iPhone/)).toBeTruthy();
        expect(getByText(/mfa.added/)).toBeTruthy();
    });
  });

  test('enters enrollment flow', async () => {
    const { getByText, getByPlaceholderText } = render(<MFASetup />);
    
    await waitFor(() => expect(getByText('mfa.addNew')).toBeTruthy());
    
    fireEvent.press(getByText('mfa.addNew'));
    
    expect(getByText('mfa.nameDescription')).toBeTruthy();
    
    // Enter name
    fireEvent.changeText(getByPlaceholderText('mfa.deviceNamePlaceholder'), 'New Device');
    
    // Mock enroll response
    mockEnroll.mockResolvedValue({
        data: {
            id: 'factor_123',
            totp: { uri: 'otpauth://test', secret: 'SECRET123' }
        },
        error: null
    });

    fireEvent.press(getByText('mfa.continue'));
    
    await waitFor(() => {
        expect(getByText('mfa.scanQR')).toBeTruthy();
        expect(getByText('SECRET123')).toBeTruthy();
    });
  });
});
