import * as Localization from 'expo-localization';

let currentLocale = Localization.getLocales?.()?.[0]?.languageTag || 'en-US';

export const setRegionLocale = (locale: string) => {
  currentLocale = locale;
};

// 1. Define Regions and their default Currencies
const REGION_CURRENCIES: Record<string, string> = {
  'en-US': 'USD', // USA
  'es-CL': 'CLP', // Chile
  'es-MX': 'MXN', // Mexico
  'es-AR': 'ARS', // Argentina
  'es-CO': 'COP', // Colombia
  'es-PE': 'PEN', // Peru
};

// 2. Define Symbols for each Currency (Single Source of Truth)
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'CLP': '$',
  'MXN': '$',
  'ARS': '$',
  'COP': '$',
  'PEN': 'S/',
};

/**
 * Formats a number as a price string according to the selected region/locale.
 * Uses CURRENCY_SYMBOLS to ensure consistent symbol rendering across all devices.
 */
export const formatPrice = (amount: number, currencyCode?: string): string => {
  // If no currency is explicitly passed, use the default for the current region, or fallback to USD
  const currency = currencyCode || REGION_CURRENCIES[currentLocale] || 'USD';
  
  // Get the preferred symbol from our single source of truth
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  try {
    // We strictly use the symbol from our map, relying on Intl mainly for thousand/decimal separators
    const formattedComponents = new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency: currency, 
      currencyDisplay: 'code', // We'll replace the code manually to be safe
    }).formatToParts(amount);

    // Reconstruct the string: Replace 'currency' part with our symbol
    return formattedComponents.map(part => {
      if (part.type === 'currency') return symbol;
      return part.value;
    }).join('').trim();

  } catch (error) {
    // Fallback if Intl fails
    return `${symbol}${amount.toFixed(2)}`;
  }
};
