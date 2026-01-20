export type Language = {
  code: string
  label: string // Fallback label
  i18nKey: string // Key for translation
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English', i18nKey: 'settings.languages.english' },
  { code: 'es', label: 'Español', i18nKey: 'settings.languages.spanish' },
]

export const DEFAULT_LANGUAGE = 'en'
