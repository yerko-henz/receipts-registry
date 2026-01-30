import React from 'react';
import { render } from '@testing-library/react-native';
import CategoryBreakdown from '../CategoryBreakdown';

// Mocks
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: any) => options?.defaultValue || key }),
}));

jest.mock('@/constants/categories', () => ({
  getCategoryIcon: jest.fn().mockReturnValue(() => null), // Return a component that renders null
}));

jest.mock('@/components/receiptAnalizer/components/ProgressBar', () => ({
  ProgressBar: () => null,
}));

jest.mock('@/lib/currency', () => ({
    formatPrice: (amount: number) => `$${amount}`,
}));

describe('CategoryBreakdown', () => {
  test('renders nothing when data is empty', () => {
    const { toJSON } = render(<CategoryBreakdown data={[]} />);
    expect(toJSON()).toBeNull();
  });

  test('renders breakdown correctly', () => {
    const mockData: any[] = [
      {
        date: '2023-01-01',
        dateKey: '2023-01-01',
        dayName: 'Sun',
        totalSpent: 100,
        count: 2,
        isToday: false,
        receipts: [
          { id: '1', total_amount: 60, category: 'Food' },
          { id: '2', total_amount: 40, category: 'Transport' },
        ]
      }
    ];

    const { getByText } = render(<CategoryBreakdown data={mockData} />);
    
    expect(getByText('Spending Breakdown')).toBeTruthy();
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
    expect(getByText('$60')).toBeTruthy();
    expect(getByText('60.0%')).toBeTruthy();
    expect(getByText('$40')).toBeTruthy();
    expect(getByText('40.0%')).toBeTruthy();
  });

  test('groups categories correctly', () => {
     const mockData: any[] = [
      {
        date: '2023-01-01',
        dateKey: '2023-01-01',
        dayName: 'Sun',
        totalSpent: 100,
        count: 3,
        isToday: false,
        receipts: [
          { id: '1', total_amount: 50, category: 'Food' },
          { id: '2', total_amount: 20, category: 'Food' },
          { id: '3', total_amount: 30, category: 'Other' },
        ]
      }
    ];

    const { getByText } = render(<CategoryBreakdown data={mockData} />);
    
    // Food: 70 total, 70%
    // Other: 30 total, 30%
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('$70')).toBeTruthy();
    expect(getByText('70.0%')).toBeTruthy();
    
    expect(getByText('Other')).toBeTruthy();
    expect(getByText('$30')).toBeTruthy();
    expect(getByText('30.0%')).toBeTruthy();
  });
});
