import React from 'react';
import { render, fireEvent, waitFor, renderHook } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../ThemeProvider';
import { storage } from '@/lib/storage';
import { Text, Button } from 'react-native';

// Mock storage
jest.mock('@/lib/storage', () => ({
  storage: {
    getTheme: jest.fn(),
    setTheme: jest.fn(),
  },
}));

// Mock wrapper hook
jest.mock('@/hooks/use-native-color-scheme', () => ({
  useColorScheme: jest.fn(),
}));

import { useColorScheme } from '@/hooks/use-native-color-scheme';
const mockUseColorScheme = useColorScheme as jest.Mock;

const TestComponent = () => {
  const { theme, activeTheme, setTheme } = useTheme();
  return (
    <>
      <Text testID="theme">{theme}</Text>
      <Text testID="activeTheme">{activeTheme}</Text>
      <Button title="Set Dark" onPress={() => setTheme('dark')} />
    </>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
  });

  it('loads saved theme from storage', async () => {
    (storage.getTheme as jest.Mock).mockResolvedValue('dark');

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Initial render might return null until loaded, so waitFor
    await waitFor(() => {
        expect(getByTestId('theme').children[0]).toBe('dark');
        expect(getByTestId('activeTheme').children[0]).toBe('dark');
    });

    expect(storage.getTheme).toHaveBeenCalled();
  });

  it('defaults to system (light) if no storage', async () => {
    (storage.getTheme as jest.Mock).mockResolvedValue(null);
    mockUseColorScheme.mockReturnValue('light');

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
        expect(getByTestId('theme').children[0]).toBe('system');
        expect(getByTestId('activeTheme').children[0]).toBe('light');
    });
  });

  it('updates theme and saves to storage', async () => {
    (storage.getTheme as jest.Mock).mockResolvedValue('system');

    const { getByText, getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => expect(getByTestId('theme')).toBeTruthy());

    fireEvent.press(getByText('Set Dark'));

    await waitFor(() => {
        expect(getByTestId('theme').children[0]).toBe('dark');
    });

    expect(storage.setTheme).toHaveBeenCalledWith('dark');
  });
});
