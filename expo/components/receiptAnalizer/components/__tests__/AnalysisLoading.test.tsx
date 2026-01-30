import React from 'react';
import { render } from '@testing-library/react-native';
import { AnalysisLoading } from '../AnalysisLoading';

// Mock dependencies
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ activeTheme: 'light' }),
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

describe('AnalysisLoading', () => {
  it('renders with progress text', () => {
    const { getByText } = render(<AnalysisLoading progress={50} />);
    expect(getByText('Analyzing Receipt...')).toBeTruthy();
  });

  it('shows AI extraction message', () => {
    const { getByText } = render(<AnalysisLoading progress={75} />);
    expect(getByText(/extracting item details/i)).toBeTruthy();
  });
});
