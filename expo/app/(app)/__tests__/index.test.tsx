import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../index';
import { useRecentReceipts } from '@/hooks/queries/useReceipts';
import { useGlobalStore } from '@/store/useGlobalStore';
import { useReceiptsStore } from '@/store/useReceiptsStore';
import { groupReceiptsByDay } from '@/lib/date';

// Mocks
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@/hooks/queries/useReceipts', () => ({
  useRecentReceipts: jest.fn(),
}));

jest.mock('@/store/useGlobalStore', () => ({
  useGlobalStore: jest.fn(),
}));

jest.mock('@/store/useReceiptsStore', () => ({
  useReceiptsStore: jest.fn(),
}));

jest.mock('@/lib/date', () => ({
  groupReceiptsByDay: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
        if (key === 'home.welcome') return 'Welcome';
        if (key === 'home.recentReceipts') return `${options?.count} items in last ${options?.days} days`;
        if (key === 'home.memberSince') return `Member for ${options?.days} days`;
        return key;
    },
    i18n: { language: 'en' }
  }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ activeTheme: 'light' }),
}));

jest.mock('@/components/ReceiptActivityChart', () => 'ReceiptActivityChart');
jest.mock('@/components/CategoryBreakdown', () => 'CategoryBreakdown');

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

describe('HomeScreen', () => {
  const FIXED_DATE = new Date('2023-01-08T12:00:00Z');
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: new Date('2023-01-01T12:00:00Z').toISOString(), // Exactly 7 days before FIXED_DATE
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_DATE);
    
    (useGlobalStore as unknown as jest.Mock).mockImplementation((selector) => selector({ user: mockUser }));
    (useReceiptsStore as unknown as jest.Mock).mockImplementation((selector) => selector({ filters: { dateMode: 'created' } }));
    (groupReceiptsByDay as jest.Mock).mockReturnValue([]);
  });

  afterEach(() => {
      jest.useRealTimers();
  });

  it('renders loading state when data is fetching', () => {
    (useRecentReceipts as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const { getByTestId, queryByText } = render(<HomeScreen />);
    // The component returns ActivityIndicator which usually doesn't have text
    // We can check if the welcome text is NOT there
    expect(queryByText(/Welcome/)).toBeNull();
  });

  it('renders dashboard with data', () => {
    const mockData = [{ id: '1', total_amount: 100 }];
    (useRecentReceipts as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: jest.fn(),
    });
    
    (groupReceiptsByDay as jest.Mock).mockReturnValue([
        { date: '2023-01-01', count: 1, total: 100, items: [] }
    ]);

    const { getByText } = render(<HomeScreen />);

    expect(getByText(/Welcome, test!/)).toBeTruthy();
    expect(getByText('1 items in last 1 days')).toBeTruthy();
    expect(getByText(/Member for 7 days/)).toBeTruthy();
  });

  it('handles user with no email gracefully', () => {
      (useGlobalStore as unknown as jest.Mock).mockImplementation((selector) => selector({ user: { ...mockUser, email: undefined } }));
      (useRecentReceipts as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { getByText } = render(<HomeScreen />);
      expect(getByText(/Welcome, !/)).toBeTruthy();
  });
});
