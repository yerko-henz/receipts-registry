import React from 'react';
import { render } from '@testing-library/react-native';
import { Card } from '../card';
import { Text } from 'react-native';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('Card', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });
});
