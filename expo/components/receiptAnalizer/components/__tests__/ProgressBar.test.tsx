import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressBar } from '../ProgressBar';

// Use jest-expo's reanimated mock
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ProgressBar progress={50} color="#1ab8a0" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with different progress values', () => {
    expect(() => render(<ProgressBar progress={0} color="#1ab8a0" />)).not.toThrow();
    expect(() => render(<ProgressBar progress={100} color="#ff0000" />)).not.toThrow();
  });
});
