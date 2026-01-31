import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReceiptsUnifiedScreen from '../receipts';
import { useInfiniteReceipts, useDeleteReceipt } from '@/hooks/queries/useReceipts';
import { useGlobalStore } from '@/store/useGlobalStore';
import { useReceiptsStore } from '@/store/useReceiptsStore';
import { syncReceiptsToSheet } from '@/services/google-sheets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Mocks
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@/hooks/queries/useReceipts', () => ({
  useInfiniteReceipts: jest.fn(),
  useDeleteReceipt: jest.fn(),
}));

jest.mock('@/store/useGlobalStore', () => ({
  useGlobalStore: jest.fn(),
}));

jest.mock('@/store/useReceiptsStore', () => ({
  useReceiptsStore: jest.fn(),
}));

jest.mock('@/services/google-sheets', () => ({
  syncReceiptsToSheet: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  multiGet: jest.fn().mockResolvedValue([['google_sheet_id', null], ['last_export_date', null]]),
  multiSet: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
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
}));

jest.mock('@/components/DateRangeFilter', () => ({
    DateRangeFilter: 'DateRangeFilter'
}));
jest.mock('@shopify/flash-list', () => ({
    FlashList: (props: any) => {
        const { ScrollView, View } = require('react-native');
        const React = require('react');
        return (
            <ScrollView>
                {props.data.map((item: any, index: number) => (
                    <React.Fragment key={index}>
                        {props.renderItem({ item, index })}
                    </React.Fragment>
                ))}
                {props.ListEmptyComponent && props.data.length === 0 && props.ListEmptyComponent}
            </ScrollView>
        );
    }
}));

// Mock Lucide Icons (handle any icon name)
jest.mock('lucide-react-native', () => {
    const React = require('react');
    const { View } = require('react-native');
    const mockIcon = (props: any) => React.createElement(View, props);
    return new Proxy({}, {
        get: () => mockIcon
    });
});

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-gesture-handler', () => {
    const mockGesture = {
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
    };
    return {
        Gesture: {
            Pan: () => mockGesture,
            Pinch: () => mockGesture,
            Simultaneous: () => mockGesture,
        },
        GestureDetector: ({ children }: any) => children,
        GestureHandlerRootView: ({ children }: any) => children,
    };
});

describe('ReceiptsUnifiedScreen', () => {
  const mockUser = { id: 'user-123' };
  const mockReceipts = [
    { id: '1', merchant_name: 'Store A', total_amount: 50, category: 'Food', created_at: '2023-01-01T10:00:00Z' },
    { id: '2', merchant_name: 'Store B', total_amount: 30, category: 'Transport', created_at: '2023-01-02T10:00:00Z' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useGlobalStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { user: mockUser, region: 'US' };
        return selector(state);
    });
    (useReceiptsStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { filters: { dateMode: 'created' }, actions: { setFilters: jest.fn() } };
        return selector(state);
    });
    (useDeleteReceipt as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  });

  it('renders loading state initially', () => {
    (useInfiniteReceipts as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });

    const { getByTestId, queryByText } = render(<ReceiptsUnifiedScreen />);
    // FlashList is mocked as ScrollView, but it should still render headers etc.
    expect(queryByText('receipts.title')).toBeTruthy();
  });

  it('renders receipts list', async () => {
    (useInfiniteReceipts as jest.Mock).mockReturnValue({
      data: { pages: [{ data: mockReceipts, count: 2 }] },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });

    const { getByText, getAllByText } = render(<ReceiptsUnifiedScreen />);

    expect(getByText('Store A')).toBeTruthy();
    expect(getByText('Store B')).toBeTruthy();
    expect(getByText('2 receipts.itemsFound')).toBeTruthy();
  });

  it('shows empty state when no receipts', () => {
    (useInfiniteReceipts as jest.Mock).mockReturnValue({
      data: { pages: [{ data: [], count: 0 }] },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });

    const { getByText } = render(<ReceiptsUnifiedScreen />);
    expect(getByText('receipts.noReceipts')).toBeTruthy();
  });

  it('opens delete confirmation on long press (or delete icon if expanded)', async () => {
      (useInfiniteReceipts as jest.Mock).mockReturnValue({
        data: { pages: [{ data: [mockReceipts[0]], count: 1 }] },
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        refetch: jest.fn(),
      });

      const { getByText, queryByText } = render(<ReceiptsUnifiedScreen />);
      
      // Expand the first receipt
      fireEvent.press(getByText('Store A'));
      
      // Look for delete button text
      const deleteBtn = getByText('receipts.delete');
      fireEvent.press(deleteBtn);

      expect(Alert.alert).toHaveBeenCalledWith(
          'receipts.deleteTitle',
          'receipts.deleteConfirm',
          expect.any(Array)
      );
  });
});
