import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReceiptsUnifiedScreen from '../receipts';

// Mocks
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: any) => options?.defaultValue || key, i18n: { language: 'en' } }),
}));

jest.mock('expo-router', () => ({
    useFocusEffect: jest.fn(),
    useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) => <>{children}</>,
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return {
        ...Reanimated,
        useSharedValue: jest.fn(() => ({ value: 0 })),
        useAnimatedStyle: jest.fn(() => ({})),
        withSpring: jest.fn(),
        withTiming: jest.fn(),
        withRepeat: jest.fn(),
        createAnimatedComponent: (cmp: any) => cmp,
    };
});

jest.mock('react-native-gesture-handler', () => ({
    Gesture: {
        Pinch: () => ({ onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
        Pan: () => ({ onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
        Simultaneous: jest.fn(),
    },
    GestureDetector: ({ children }: any) => <>{children}</>,
    GestureHandlerRootView: ({ children }: any) => <>{children}</>,
}));

jest.mock('@shopify/flash-list', () => {
    const { FlatList } = require('react-native');
    return { FlashList: FlatList };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
    multiGet: jest.fn().mockResolvedValue([['google_sheet_id', null], ['last_export_date', null]]),
    multiSet: jest.fn().mockResolvedValue(null),
}));

// Mock Stores
jest.mock('@/store/useGlobalStore', () => ({
    useGlobalStore: (selector: any) => selector({
        user: { id: 'test-user-id' },
        region: 'US',
    }),
}));

jest.mock('@/store/useReceiptsStore', () => ({
    useReceiptsStore: (selector: any) => selector({
        actions: { setFilters: jest.fn() },
    }),
}));

// Mock Queries
const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();

jest.mock('@/hooks/queries/useReceipts', () => ({
    useInfiniteReceipts: jest.fn(),
    useDeleteReceipt: jest.fn(() => ({ mutate: jest.fn() })),
}));

import { useInfiniteReceipts } from '@/hooks/queries/useReceipts';

jest.mock('@/components/DateRangeFilter', () => ({
    DateRangeFilter: () => null,
}));

jest.mock('@/lib/currency', () => ({
    formatPrice: (amount: number) => `$${amount.toFixed(2)}`,
}));

describe('ReceiptsUnifiedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state correctly', () => {
    (useInfiniteReceipts as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        refetch: mockRefetch,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
    });

    const { getByTestId, queryByText } = render(<ReceiptsUnifiedScreen />);
    
    // ActivityIndicator doesn't have text, but we can check if absence of list or presence of indicator
    // FlashList (mocked as FlatList) renders EmptyComponent if data is empty/null which has ActivityIndicator
    // We can check if "No receipts" text is NOT present.
    expect(queryByText('receipts.noReceipts')).toBeNull();
  });

  test('renders empty state correctly', () => {
    (useInfiniteReceipts as jest.Mock).mockReturnValue({
        data: { pages: [{ data: [], count: 0 }] },
        isLoading: false,
        refetch: mockRefetch,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
    });

    const { getByText } = render(<ReceiptsUnifiedScreen />);
    
    expect(getByText('receipts.noReceipts')).toBeTruthy();
  });

  test('renders receipts list correctly', () => {
    const mockReceipts = [
        {
            id: '1',
            merchant_name: 'Test Merchant',
            total_amount: 100,
            transaction_date: '2023-01-01',
            created_at: '2023-01-01T10:00:00Z',
            currency: 'USD',
            category: 'Food',
        }
    ];

    (useInfiniteReceipts as jest.Mock).mockReturnValue({
        data: { pages: [{ data: mockReceipts, count: 1 }] },
        isLoading: false,
        refetch: mockRefetch,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
    });

    const { getByText, getAllByText } = render(<ReceiptsUnifiedScreen />);
    
    expect(getByText('Test Merchant')).toBeTruthy();
    // Use regex to be flexible with currency symbol spacing (NBSP)
    // Expect at least one occurrence (Header total + Item total might both match)
    const priceElements = getAllByText(/100.00/);
    expect(priceElements.length).toBeGreaterThan(0);
    
    expect(getByText('1 receipts.itemsFound')).toBeTruthy(); // mocked t returns key/default
  });
});
