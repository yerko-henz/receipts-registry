import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReceiptAnalyzerScreen from '../receiptAnalizer';

// Mocks
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/components/ThemeProvider', () => ({
    useTheme: () => ({ activeTheme: 'light' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ 
      t: (key: string) => key, 
      i18n: { language: 'en' } 
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) => <>{children}</>,
}));

jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    launchImageLibraryAsync: jest.fn().mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'test-uri', width: 100, height: 100 }]
    }),
    MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: jest.fn().mockResolvedValue({
        uri: 'manipulated-uri',
        width: 100,
        height: 100,
        base64: 'test-base64'
    }),
    SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    multiGet: jest.fn().mockResolvedValue([['google_sheet_id', null], ['last_export_date', null]]),
    multiSet: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/services/receipts', () => ({
    createReceipts: jest.fn().mockResolvedValue(null),
    uploadReceiptImage: jest.fn().mockResolvedValue('test-url'),
}));

// Store Mocks
const mockProcessImages = jest.fn();
const mockResetScanner = jest.fn();
const mockAddReceipt = jest.fn();

jest.mock('@/store/useScannerStore', () => ({
    useScannerStore: jest.fn(),
}));

jest.mock('@/store/useReceiptsStore', () => ({
    useReceiptsStore: (selector: any) => selector({
        actions: {
            addReceipt: mockAddReceipt,
            fetchReceipts: jest.fn(),
        }
    }),
}));

import { useScannerStore } from '@/store/useScannerStore';

describe('ReceiptAnalyzerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders landing state correctly', () => {
    (useScannerStore as unknown as jest.Mock).mockImplementation((selector) => selector({
        items: [],
        processImages: mockProcessImages,
        resetScanner: mockResetScanner,
    }));

    const { getByText } = render(<ReceiptAnalyzerScreen />);
    
    expect(getByText('scanner.scanYourReceipt')).toBeTruthy();
    expect(getByText('scanner.heroTitle')).toBeTruthy();
    expect(getByText('scanner.uploadTitle')).toBeTruthy();
  });

  test('handles image picking', async () => {
    (useScannerStore as unknown as jest.Mock).mockImplementation((selector) => selector({
        items: [],
        processImages: mockProcessImages,
        resetScanner: mockResetScanner,
    }));

    const { getByText } = render(<ReceiptAnalyzerScreen />);
    const uploadButton = getByText('scanner.uploadTitle');
    
    fireEvent.press(uploadButton);

    await waitFor(() => {
        expect(mockProcessImages).toHaveBeenCalled();
    });
  });

  test('renders results state correctly', () => {
    const mockItems = [
        { 
            id: '1', 
            status: 'completed', 
            uri: 'test-uri',
            data: {
                merchantName: 'Test Merchant',
                total: 100,
                date: '2023-01-01',
                items: [],
                currency: 'USD'
            }
        }
    ];

    (useScannerStore as unknown as jest.Mock).mockImplementation((selector) => selector({
        items: mockItems,
        processImages: mockProcessImages,
        resetScanner: mockResetScanner,
    }));

    const { getByText } = render(<ReceiptAnalyzerScreen />);
    
    expect(getByText('scanner.scanNew')).toBeTruthy(); // Header changes
    expect(getByText('1 / 1 Completed')).toBeTruthy(); // Results header
    expect(getByText('Test Merchant')).toBeTruthy(); // Result item
  });
});
