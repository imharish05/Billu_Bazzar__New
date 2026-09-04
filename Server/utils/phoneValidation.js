'use strict';

/**
 * Phone validation rules for India and UAE/Dubai:
 * - India (IN / +91): Exactly 10 digits, must start with 6, 7, 8, or 9.
 * - UAE (AE / +971): Exactly 9 digits, mobile numbers must start with 5.
 *
 * Stored international format: +91XXXXXXXXXX or +971XXXXXXXXX
 */

/**
 * Parses and validates an international or national phone number string.
 * @param {string} phone - Raw or formatted phone number
 * @param {object} [options] - Options: { required: boolean, defaultCountry: 'IN' | 'AE' }
 * @returns {{ isValid: boolean, message?: string, formatted?: string, country?: 'IN' | 'AE', nationalNumber?: string, countryCode?: string }}
 */
function validatePhoneNumber(phone, options = {}) {
  const { required = true, defaultCountry = 'IN' } = options;

  if (!phone || !String(phone).trim()) {
    if (!required) return { isValid: true, formatted: null };
    return { isValid: false, message: 'Phone number is required.' };
  }

  const raw = String(phone).trim();

  // Check if string contains letters or disallowed symbols
  if (/[a-zA-Z]/.test(raw)) {
    return { isValid: false, message: 'Phone number must not contain letters.' };
  }
  if (/[^0-9+\s\-()]/.test(raw)) {
    return { isValid: false, message: 'Phone number contains invalid characters.' };
  }

  // Remove spaces, hyphens, parentheses, and non-digits
  const digitsOnly = raw.replace(/\D/g, '');

  if (!digitsOnly) {
    return { isValid: false, message: 'Phone number must contain only numeric digits.' };
  }

  let country = null;
  let countryCode = null;
  let nationalNumber = null;

  // Check prefix
  if (raw.startsWith('+91') || (digitsOnly.startsWith('91') && digitsOnly.length === 12)) {
    country = 'IN';
    countryCode = '+91';
    nationalNumber = digitsOnly.startsWith('91') && digitsOnly.length === 12 ? digitsOnly.slice(2) : digitsOnly.replace(/^91/, '');
  } else if (raw.startsWith('+971') || (digitsOnly.startsWith('971') && digitsOnly.length === 12)) {
    country = 'AE';
    countryCode = '+971';
    nationalNumber = digitsOnly.startsWith('971') && digitsOnly.length === 12 ? digitsOnly.slice(3) : digitsOnly.replace(/^971/, '');
  } else if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
    country = 'IN';
    countryCode = '+91';
    nationalNumber = digitsOnly;
  } else if (digitsOnly.length === 9 && /^5/.test(digitsOnly)) {
    country = 'AE';
    countryCode = '+971';
    nationalNumber = digitsOnly;
  } else if (defaultCountry === 'AE' && (digitsOnly.startsWith('05') || digitsOnly.startsWith('5'))) {
    country = 'AE';
    countryCode = '+971';
    nationalNumber = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
  } else {
    // Default fallback based on initial digits or defaultCountry
    if (defaultCountry === 'AE') {
      country = 'AE';
      countryCode = '+971';
      nationalNumber = digitsOnly;
    } else {
      country = 'IN';
      countryCode = '+91';
      nationalNumber = digitsOnly;
    }
  }

  // 1. India Validation (+91)
  if (country === 'IN') {
    if (nationalNumber.length !== 10) {
      if (nationalNumber.length < 10) {
        return { isValid: false, message: 'India mobile number must be exactly 10 digits.' };
      }
      return { isValid: false, message: 'India mobile number cannot exceed 10 digits.' };
    }
    if (!/^[6-9]/.test(nationalNumber)) {
      return { isValid: false, message: 'India mobile numbers must start with 6, 7, 8, or 9 (rejects 0–5).' };
    }
    return {
      isValid: true,
      country: 'IN',
      countryCode: '+91',
      nationalNumber,
      formatted: `+91${nationalNumber}`
    };
  }

  // 2. UAE Validation (+971)
  if (country === 'AE') {
    if (nationalNumber.length !== 9) {
      if (nationalNumber.length < 9) {
        return { isValid: false, message: 'UAE mobile number must be exactly 9 digits.' };
      }
      return { isValid: false, message: 'UAE mobile number cannot exceed 9 digits.' };
    }
    if (!/^5/.test(nationalNumber)) {
      return { isValid: false, message: 'UAE mobile number must start with 5 (e.g. 50, 52, 54, 55, 56, 58).' };
    }
    return {
      isValid: true,
      country: 'AE',
      countryCode: '+971',
      nationalNumber,
      formatted: `+971${nationalNumber}`
    };
  }

  return {
    isValid: false,
    message: 'Only India (+91) and UAE/Dubai (+971) phone numbers are supported.'
  };
}

/**
 * Normalizes phone number to international format (+91XXXXXXXXXX or +971XXXXXXXXX).
 * Returns original if invalid or empty.
 */
function formatToInternational(phone, defaultCountry = 'IN') {
  const result = validatePhoneNumber(phone, { required: false, defaultCountry });
  return result.isValid && result.formatted ? result.formatted : phone;
}

module.exports = {
  validatePhoneNumber,
  formatToInternational
};
