import AsyncStorage from '@react-native-async-storage/async-storage'

const LANGUAGE_KEY = '@app_language'

export const storage = {
  async getLanguage(): Promise<string | null> {
    return AsyncStorage.getItem(LANGUAGE_KEY)
  },
  
  async setLanguage(lang: string): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang)
  },

  async getTheme(): Promise<string | null> {
    return AsyncStorage.getItem('@app_theme')
  },

  async setTheme(theme: string): Promise<void> {
    await AsyncStorage.setItem('@app_theme', theme)
  },

  async getRegion(): Promise<string | null> {
    return AsyncStorage.getItem('@app_region')
  },

  async setRegion(region: string): Promise<void> {
    await AsyncStorage.setItem('@app_region', region)
  },
}