import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../receiptAnalizer';
import { useScannerStore } from '@/store/useScannerStore';
import { useReceiptsStore } from '@/store/useReceiptsStore';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync } from 'expo-image-manipulator';
import { Alert } from 'react-native';

// Mocks
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

jest.mock('@/store/useScannerStore', () => ({
  useScannerStore: jest.fn(),
}));

jest.mock('@/store/useReceiptsStore', () => ({
  useReceiptsStore: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ activeTheme: 'light' }),
  ThemeProvider: ({ children }: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('lucide-react-native', () => {
    const React = require('react');
    const { View } = require('react-native');
    const mockIcon = (props: any) => React.createElement(View, props);
    return new Proxy({}, {
        get: () => mockIcon
    });
});

jest.mock('@/components/receiptAnalizer/ReceiptAnalyzer', () => ({
    ReceiptAnalyzer: () => {
        const React = require('react');
        const { Text } = require('react-native');
        return React.createElement(Text, {}, 'ReceiptAnalyzer Component');
    }
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('ReceiptAnalizer Screen', () => {
  const mockProcessImages = jest.fn();
  const mockResetScanner = jest.fn();
  const mockAddReceipt = jest.fn();
  const mockFetchReceipts = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useScannerStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { 
            items: [], 
            processImages: mockProcessImages, 
            resetScanner: mockResetScanner 
        };
        return selector(state);
    });
    (useReceiptsStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { 
            actions: { 
                addReceipt: mockAddReceipt, 
                fetchReceipts: mockFetchReceipts 
            } 
        };
        return selector(state);
    });
  });

  it('renders landing state when no items', () => {
    const { getByText } = render(<App />);
    expect(getByText('scanner.heroTitle')).toBeTruthy();
    expect(getByText('scanner.uploadTitle')).toBeTruthy();
  });

  it('calls pickImage when upload card pressed', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'test-uri' }]
    });
    (manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'processed-uri',
        width: 100,
        height: 100,
        base64: 'base64-data'
    });

    const { getByText } = render(<App />);
    fireEvent.press(getByText('scanner.uploadTitle'));

    await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
        expect(manipulateAsync).toHaveBeenCalled();
        expect(mockProcessImages).toHaveBeenCalledWith([expect.objectContaining({ uri: 'processed-uri' })]);
    });
  });

  it('renders ReceiptAnalyzer when items exist', () => {
    (useScannerStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { 
            items: [{ id: '1', uri: 'test', status: 'pending' }], 
            processImages: mockProcessImages, 
            resetScanner: mockResetScanner 
        };
        return selector(state);
    });

    const { getByText } = render(<App />);
    expect(getByText('ReceiptAnalyzer Component')).toBeTruthy();
  });
});
