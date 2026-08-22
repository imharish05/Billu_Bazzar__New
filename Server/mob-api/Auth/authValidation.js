'use strict';

/**
 * Validates email format
 * @param {string} email 
 * @returns {{ isValid: boolean, message?: string }}
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return { isValid: false, message: 'Email address is required' };
  }
  const cleanEmail = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  return { isValid: true };
};

/**
 * Validates password format & length
 * @param {string} password 
 * @returns {{ isValid: boolean, message?: string }}
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  return { isValid: true };
};

/**
 * Validates phone numbers (India +91, UAE +971, or general 7-15 digit phone formats)
 * @param {string} phone 
 * @returns {{ isValid: boolean, message?: string }}
 */
const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return { isValid: false, message: 'Phone number is required' };
  }

  const clean = phone.trim().replace(/^\+/, '').replace(/[\s\-()]/g, '');

  if (!/^\d+$/.test(clean)) {
    return { isValid: false, message: 'Phone number must contain only digits' };
  }

  const isIndiaPrefix = clean.startsWith('91');
  const isUaePrefix = clean.startsWith('971');

  // 1. India checks
  if (isIndiaPrefix || (/^[6-9]/.test(clean) && clean.length >= 9 && clean.length <= 11)) {
    if (isIndiaPrefix) {
      const localPart = clean.slice(2);
      if (localPart.length !== 10) {
        return { 
          isValid: false, 
          message: 'India number with country code must be 12 digits (+91 followed by 10 digits)' 
        };
      }
      if (!/^[6-9]/.test(localPart)) {
        return { 
          isValid: false, 
          message: 'India mobile numbers must start with 6, 7, 8, or 9' 
        };
      }
      return { isValid: true };
    } else {
      if (clean.length !== 10) {
        return { 
          isValid: false, 
          message: 'India mobile number must be exactly 10 digits (excluding country code)' 
        };
      }
      if (!/^[6-9]/.test(clean)) {
        return { 
          isValid: false, 
          message: 'India mobile numbers must start with 6, 7, 8, or 9' 
        };
      }
      return { isValid: true };
    }
  }

  // 2. UAE checks
  if (isUaePrefix || /^0?5[024568]/.test(clean) || /^0?4/.test(clean)) {
    if (isUaePrefix) {
      const localPart = clean.slice(3); // Remove 971
      if (localPart.startsWith('5')) {
        if (localPart.length !== 9) {
          return {
            isValid: false,
            message: 'UAE mobile with country code must be 11 digits (+971 50/52/54/55/56/58 followed by 7 digits)'
          };
        }
        if (!/^5[024568]/.test(localPart)) {
          return {
            isValid: false,
            message: 'UAE mobile operator code must be 50, 52, 54, 55, 56, or 58'
          };
        }
        return { isValid: true };
      } else if (localPart.startsWith('4')) {
        if (localPart.length !== 8) {
          return {
            isValid: false,
            message: 'Dubai landline with country code must be 10 digits (+971 4 followed by 7 digits)'
          };
        }
        return { isValid: true };
      } else {
        return {
          isValid: false,
          message: 'Invalid UAE number. Mobile must start with 5 and landline must start with 4'
        };
      }
    } else {
      // Local UAE format
      if (clean.startsWith('05') || clean.startsWith('5')) {
        const hasLeadingZero = clean.startsWith('0');
        const expectedLength = hasLeadingZero ? 10 : 9;
        if (clean.length !== expectedLength) {
          return {
            isValid: false,
            message: hasLeadingZero 
              ? 'UAE mobile number must be 10 digits when starting with 0 (e.g. 050 123 4567)'
              : 'UAE mobile number must be 9 digits (excluding leading 0)'
          };
        }
        const operatorCode = hasLeadingZero ? clean.slice(1, 3) : clean.slice(0, 2);
        const validCodes = ['50', '52', '54', '55', '56', '58'];
        if (!validCodes.includes(operatorCode)) {
          return {
            isValid: false,
            message: 'UAE mobile operator code must be 50, 52, 54, 55, 56, or 58'
          };
        }
        return { isValid: true };
      } else if (clean.startsWith('04') || clean.startsWith('4')) {
        const hasLeadingZero = clean.startsWith('0');
        const expectedLength = hasLeadingZero ? 9 : 8;
        if (clean.length !== expectedLength) {
          return {
            isValid: false,
            message: hasLeadingZero
              ? 'Dubai landline must be 9 digits when starting with 04 (e.g. 04 123 4567)'
              : 'Dubai landline must be 8 digits (excluding leading 0)'
          };
        }
        return { isValid: true };
      }
    }
  }

  // 3. Fallback for general valid phone numbers (7 to 15 digits)
  if (clean.length >= 7 && clean.length <= 15) {
    return { isValid: true };
  }

  return {
    isValid: false,
    message: 'Please enter a valid phone number'
  };
};

/**
 * Validates 6-digit OTP format
 * @param {string|number} otp 
 * @returns {{ isValid: boolean, message?: string }}
 */
const validateOtp = (otp) => {
  if (!otp) {
    return { isValid: false, message: 'OTP is required' };
  }
  const otpStr = otp.toString().trim();
  if (!/^\d{6}$/.test(otpStr)) {
    return { isValid: false, message: 'OTP must be a 6-digit number' };
  }
  return { isValid: true };
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateOtp,
};
