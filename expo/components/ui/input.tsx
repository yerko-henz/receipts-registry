import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  /** Disable autocomplete (e.g. for current password so it isn't prefilled) */
  autoComplete?: 'off' | 'password' | 'password-new' | 'email' | 'username' | 'one-time-code';
  /** iOS: avoid suggesting/autofilling (e.g. "none" for current password) */
  textContentType?: 'none' | 'password' | 'newPassword' | 'emailAddress' | 'username';
  editable?: boolean;
}

export function Input({ label, value, onChangeText, placeholder, secureTextEntry, error, autoCapitalize = 'none', keyboardType = 'default', autoComplete, textContentType, editable = true }: InputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            color: colors.text,
            borderColor: error ? '#ef4444' : colors.icon
          }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.icon}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        textContentType={textContentType}
        editable={editable}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4
  }
});
