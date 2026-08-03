import currencyJs from 'currency.js';

export const DEFAULT_AED_RATE = 26.06; // 1 AED = 26.06 INR (updated Jul 2026)

export const formatPrice = (value, currencyCode = 'INR', rate = DEFAULT_AED_RATE) => {
  const numVal = Number(value || 0);
  if (currencyCode === 'AED') {
    const effectiveRate = Number(rate) > 0 ? Number(rate) : DEFAULT_AED_RATE;
    const converted = numVal / effectiveRate;
    return currencyJs(converted, { symbol: 'AED\u00A0', precision: 2, formatWithSymbol: true }).format();
  }
  // Default to INR
  return currencyJs(numVal, { symbol: '₹', precision: 0, formatWithSymbol: true }).format();
};
