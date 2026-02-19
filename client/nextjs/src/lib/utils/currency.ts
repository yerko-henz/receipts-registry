
export const REGION_CURRENCIES: Record<string, string> = {
  'en-US': 'USD', // USA
  'es-CL': 'CLP', // Chile
  'es-MX': 'MXN', // Mexico
  'es-AR': 'ARS', // Argentina
  'es-CO': 'COP', // Colombia
  'es-PE': 'PEN', // Peru
};

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
export const formatPrice = (amount: number, region: string = 'en-US', currencyCode?: string): string => {
  // If no currency is explicitly passed, use the default for the current region, or fallback to USD
  const currency = currencyCode || REGION_CURRENCIES[region] || 'USD';
  
  // Get the preferred symbol from our single source of truth
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  try {
    // We strictly use the symbol from our map, relying on Intl mainly for thousand/decimal separators
    const formattedComponents = new Intl.NumberFormat(region, {
      style: 'currency',
      currency: currency, 
      currencyDisplay: 'code', // We'll replace the code manually to be safe
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).formatToParts(amount);

    // Reconstruct the string: Replace 'currency' part with our symbol
    return formattedComponents.map(part => {
      if (part.type === 'currency') return symbol;
      return part.value;
    }).join('').trim();

  } catch (error) {
    // Fallback if Intl fails
    console.warn("Error formatting price:", error);
    const formattedAmount = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
    return `${symbol}${formattedAmount}`;
  }
};
