import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../input';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('Input', () => {
  it('renders label and placeholder', () => {
    const { getByText, getByPlaceholderText } = render(
      <Input 
        label="Username" 
        value="" 
        onChangeText={() => {}} 
        placeholder="Enter name" 
      />
    );
    expect(getByText('Username')).toBeTruthy();
    expect(getByPlaceholderText('Enter name')).toBeTruthy();
  });

  it('handles text input', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
        <Input 
          value="" 
          onChangeText={onChangeText} 
          placeholder="Type here" 
        />
      );
      
    fireEvent.changeText(getByPlaceholderText('Type here'), 'Hello');
    expect(onChangeText).toHaveBeenCalledWith('Hello');
  });

  it('displays error message', () => {
    const { getByText } = render(
        <Input 
          value="" 
          onChangeText={() => {}} 
          error="Invalid input"
        />
      );
    expect(getByText('Invalid input')).toBeTruthy();
  });
});
