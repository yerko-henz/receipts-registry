import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActionButtons } from '../ActionButtons';

// Mock dependencies
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ activeTheme: 'light' }),
}));

jest.mock('lucide-react-native', () => ({
  Download: () => 'Download',
  Save: () => 'Save',
  Loader2: () => 'Loader2',
}));

describe('ActionButtons', () => {
  it('renders Save Record button', () => {
    const { getByText } = render(<ActionButtons isSaving={false} />);
    expect(getByText('Save Record')).toBeTruthy();
  });

  it('renders Export CSV button', () => {
    const { getByText } = render(<ActionButtons isSaving={false} />);
    expect(getByText('Export CSV')).toBeTruthy();
  });

  it('shows Saving... when isSaving is true', () => {
    const { getByText } = render(<ActionButtons isSaving={true} />);
    expect(getByText('Saving...')).toBeTruthy();
  });

  it('calls onSave when Save button pressed', () => {
    const mockOnSave = jest.fn();
    const { getByText } = render(<ActionButtons isSaving={false} onSave={mockOnSave} />);
    
    fireEvent.press(getByText('Save Record'));
    expect(mockOnSave).toHaveBeenCalled();
  });
});
