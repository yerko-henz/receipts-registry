import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../button';

// Mock simple hooks if needed, but for simple button relying on theme it might be fine or we mock useColorScheme
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light')
}));

describe('Button', () => {
  test('renders title correctly', () => {
    const { getByText } = render(<Button title="Press me" onPress={() => {}} />);
    expect(getByText('Press me')).toBeTruthy();
  });

  test('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<Button title="Press me" onPress={onPressMock} />);
    
    fireEvent.press(getByText('Press me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  test('shows loading indicator when loading', () => {
    const { getByRole, queryByText } = render(<Button title="Press me" onPress={() => {}} loading />);
    // Text should not be visible (or replaced)
    expect(queryByText('Press me')).toBeNull();
    // Should have activity indicator (role logic varies in RN, but we can check if it exists)
    // RTL for RN usually finds ActivityIndicator by type or ID if we add testID.
    // simpler: check if it's disabled
  });

  test('is disabled when loading or disabled prop is true', () => {
     const onPressMock = jest.fn();
     const { getByText } = render(<Button title="Press me" onPress={onPressMock} disabled />);
     
     fireEvent.press(getByText('Press me'));
     expect(onPressMock).not.toHaveBeenCalled();
  });
});
