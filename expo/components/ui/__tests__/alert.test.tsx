import React from 'react';
import { render } from '@testing-library/react-native';
import { Alert } from '../alert';

jest.mock('lucide-react-native', () => ({
  AlertCircle: 'AlertCircle',
  CheckCircle: 'CheckCircle',
}));

describe('Alert', () => {
  it('renders correctly with default props', () => {
    const { getByText } = render(<Alert message="Something happened" />);
    expect(getByText('Something happened')).toBeTruthy();
  });

  it('renders error variant', () => {
    const { getByText } = render(<Alert message="Error!" variant="error" />);
    expect(getByText('Error!')).toBeTruthy();
    // Styling verification is tricky in unit tests, snapshot is better for that, 
    // or just checking if it doesn't crash.
  });

  it('renders success variant', () => {
     const { getByText } = render(<Alert message="Success!" variant="success" />);
     expect(getByText('Success!')).toBeTruthy();
  });
});
