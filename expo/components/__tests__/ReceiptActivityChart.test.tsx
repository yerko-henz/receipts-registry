import React from 'react';
import { render } from '@testing-library/react-native';
import ReceiptActivityChart from '../ReceiptActivityChart';
import { View } from 'react-native';

// Mocks
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@shopify/react-native-skia', () => ({
  matchFont: () => ({}), // Dummy font object
  matchFontSkia: () => ({}),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return {
        ...Reanimated,
        FadeIn: { duration: jest.fn() },
        ZoomIn: { duration: jest.fn() },
        FadeOut: { duration: jest.fn() },
        ZoomOut: { duration: jest.fn() },
    };
});

// Mock Victory Native
jest.mock('victory-native', () => {
  const { View } = require('react-native');
  return {
    CartesianChart: ({ children, data }: any) => {
      // Mock points structure. ReceiptActivityChart expects points.count array.
      // The component filters points.count.
      // We'll mimic the structure so the render prop can execute.
      // data is DayData[]
      
      // We map data to create points.count items. 
      // The component uses indices to match finalData[index].
      const countPoints = data.map((_: any) => ({ x: 0, y: 0 })); 
      
      const points = {
          count: countPoints
      };
      
      const chartBounds = { left: 0, right: 100, top: 0, bottom: 100 };
      
      // Execute children function
      return (
          <View testID="cartesian-chart">
              {children({ points, chartBounds })}
          </View>
      );
    },
    Bar: () => <View testID="victory-bar" />,
  };
});

describe('ReceiptActivityChart', () => {
    const mockData: any[] = [
      {
        date: '2023-01-01',
        dateKey: '2023-01-01',
        dayName: 'Sun',
        totalSpent: 100,
        count: 2,
        isToday: false,
        receipts: [] 
      },
      {
        date: '2023-01-02',
        dateKey: '2023-01-02',
        dayName: 'Mon',
        totalSpent: 50,
        count: 1,
        // Mark as today to test the conditional bar rendering
        isToday: true, 
        receipts: [] 
      }
    ];

  test('renders chart title and component', () => {
    const { getByText, getByTestId, getAllByTestId } = render(<ReceiptActivityChart data={mockData} />);
    
    expect(getByText('chart.weeklyActivity')).toBeTruthy();
    expect(getByTestId('cartesian-chart')).toBeTruthy();
    
    // It renders two Bar components: background layer and "today" layer
    const bars = getAllByTestId('victory-bar');
    expect(bars.length).toBe(2); 
  });
});
