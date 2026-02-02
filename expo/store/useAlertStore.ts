import { create } from 'zustand';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  title: string;
  message: string;
  buttons: AlertButton[];
  visible: boolean;
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  title: '',
  message: '',
  buttons: [],
  visible: false,
  showAlert: (title, message = '', buttons = [{ text: 'OK' }]) => {
    set({
      title,
      message,
      buttons,
      visible: true,
    });
  },
  hideAlert: () => {
    set({ visible: false });
  },
}));
