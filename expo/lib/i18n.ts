import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import { storage } from './storage'

const en = require('../locales/en.json')
const es = require('../locales/es.json')

const deviceLanguage = Localization.getLocales?.()?.[0]?.languageCode || 'en'

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3' as any,
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

storage.getLanguage().then((savedLanguage) => {
  if (savedLanguage) {
    i18n.changeLanguage(savedLanguage)
  }
})

export default i18n