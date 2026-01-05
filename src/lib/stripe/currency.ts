// Currency detection based on country code
// UK users see GBP, everyone else sees USD

export type Currency = 'gbp' | 'usd';

// Map country codes to currencies
const COUNTRY_CURRENCIES: Record<string, Currency> = {
  'GB': 'gbp',
  'UK': 'gbp',
};

// Get currency from country code
export function getCurrency(countryCode: string | undefined): Currency {
  if (!countryCode) return 'usd';
  return COUNTRY_CURRENCIES[countryCode.toUpperCase()] || 'usd';
}

// Currency symbols
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  gbp: '£',
  usd: '$',
};

// Format price for display
export function formatPrice(amountInCents: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const amount = (amountInCents / 100).toFixed(2);
  return `${symbol}${amount}`;
}

// Get exchange rate (simplified - in production use a real API)
// GBP is roughly 1.27 USD
const EXCHANGE_RATES: Record<Currency, number> = {
  gbp: 1,
  usd: 1.27,
};

// Convert amount between currencies (from GBP base)
export function convertCurrency(
  amountInCents: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) return amountInCents;

  // Convert to GBP first (base currency)
  const inGBP = fromCurrency === 'gbp'
    ? amountInCents
    : Math.round(amountInCents / EXCHANGE_RATES[fromCurrency]);

  // Then convert to target currency
  const result = toCurrency === 'gbp'
    ? inGBP
    : Math.round(inGBP * EXCHANGE_RATES[toCurrency]);

  return result;
}
