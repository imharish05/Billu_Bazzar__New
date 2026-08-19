import currencyJs from 'currency.js';

export const DEFAULT_AED_RATE = 26.06; // 1 AED = 26.06 INR (updated Jul 2026)

/**
 * Format a catalog / product price (stored in base INR) into the user's selected display currency.
 */
export const formatPrice = (value, currencyCode = 'INR', rate = DEFAULT_AED_RATE) => {
  const numVal = Number(value || 0);
  if (String(currencyCode).toUpperCase() === 'AED') {
    const effectiveRate = Number(rate) > 0 ? Number(rate) : DEFAULT_AED_RATE;
    const converted = numVal / effectiveRate;
    return currencyJs(converted, { symbol: 'AED\u00A0', precision: 2, formatWithSymbol: true }).format();
  }
  // Default to INR
  return currencyJs(numVal, { symbol: '₹', precision: 0, formatWithSymbol: true }).format();
};

/**
 * Format an order amount that is ALREADY stored in its specific currency (no division / rate conversion needed).
 */
export const formatOrderAmount = (value, orderCurrency = 'INR') => {
  const numVal = Number(value || 0);
  if (String(orderCurrency).toUpperCase() === 'AED') {
    return currencyJs(numVal, { symbol: 'AED\u00A0', precision: 2, formatWithSymbol: true }).format();
  }
  return currencyJs(numVal, { symbol: '₹', precision: 0, formatWithSymbol: true }).format();
};

