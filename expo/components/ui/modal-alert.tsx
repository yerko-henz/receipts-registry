import React from 'react';
import { Modal, StyleSheet, Text, View, Dimensions } from 'react-native';
import { useAlertStore } from '@/store/useAlertStore';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from './button';

const { width } = Dimensions.get('window');

export function ModalAlert() {
  const { visible, title, message, buttons, hideAlert } = useAlertStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {message ? (
              <Text style={[styles.message, { color: colors.icon }]}>{message}</Text>
            ) : null}
          </View>
          
          <View style={styles.footer}>
            {buttons.map((button, index) => (
              <Button
                key={index}
                title={button.text}
                onPress={() => {
                  hideAlert();
                  button.onPress?.();
                }}
                variant={
                  button.style === 'destructive' 
                    ? 'primary' // We don't have a destructive variant in the button component yet, but we can style it here or use primary
                    : button.style === 'cancel'
                    ? 'outline'
                    : 'primary'
                }
                style={[
                    styles.button,
                    button.style === 'destructive' && { backgroundColor: '#ef4444' }
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: Math.min(width * 0.85, 400),
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'column',
    gap: 12,
  },
  button: {
    width: '100%',
  },
});
