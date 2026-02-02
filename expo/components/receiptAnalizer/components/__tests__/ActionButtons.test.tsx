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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ActionButtons', () => {
  it('renders Save Record button', () => {
    const { getByText } = render(<ActionButtons isSaving={false} />);
    expect(getByText('scanner.saveRecord')).toBeTruthy();
  });

  it('renders Export CSV button', () => {
    const { getByText } = render(<ActionButtons isSaving={false} />);
    expect(getByText('scanner.exportCsv')).toBeTruthy();
  });

  it('shows Saving... when isSaving is true', () => {
    const { getByText } = render(<ActionButtons isSaving={true} />);
    expect(getByText('scanner.saving')).toBeTruthy();
  });

  it('calls onSave when Save button pressed', () => {
    const mockOnSave = jest.fn();
    const { getByText } = render(<ActionButtons isSaving={false} onSave={mockOnSave} />);
    
    fireEvent.press(getByText('scanner.saveRecord'));
    expect(mockOnSave).toHaveBeenCalled();
  });
});
