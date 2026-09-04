import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const COUNTRIES = [
  {
    code: 'IN',
    dialCode: '+91',
    name: 'India',
    flag: '🇮🇳',
    placeholder: '98765 43210',
    maxLength: 10,
    hint: '10 digits starting with 6–9',
  },
  {
    code: 'AE',
    dialCode: '+971',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    placeholder: '50 123 4567',
    maxLength: 9,
    hint: '9 digits starting with 5',
  },
];

export const validatePhoneNumber = (phone, options = {}) => {
  const { required = true, defaultCountry = 'IN' } = options;

  if (!phone || !String(phone).trim()) {
    if (!required) return { isValid: true, formatted: null };
    return { isValid: false, message: 'Phone number is required.' };
  }

  const raw = String(phone).trim();

  if (/[a-zA-Z]/.test(raw)) {
    return { isValid: false, message: 'Phone number must not contain letters.' };
  }
  if (/[^0-9+\s\-()]/.test(raw)) {
    return { isValid: false, message: 'Phone number contains invalid characters.' };
  }

  const digitsOnly = raw.replace(/\D/g, '');
  if (!digitsOnly) {
    return { isValid: false, message: 'Phone number must contain only numeric digits.' };
  }

  let country = null;
  let countryCode = null;
  let nationalNumber = null;

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

  if (country === 'AE') {
    if (nationalNumber.length !== 9) {
      if (nationalNumber.length < 9) {
        return { isValid: false, message: 'UAE mobile number must be exactly 9 digits.' };
      }
      return { isValid: false, message: 'UAE mobile number cannot exceed 9 digits.' };
    }
    if (!/^5/.test(nationalNumber)) {
      return { isValid: false, message: 'UAE mobile numbers must start with 5 (e.g. 50, 52, 54, 55, 56, 58).' };
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
};

export const parsePhoneNumber = (phone, defaultCountry = 'IN') => {
  if (!phone || !String(phone).trim()) {
    return {
      country: defaultCountry,
      countryCode: defaultCountry === 'AE' ? '+971' : '+91',
      nationalNumber: ''
    };
  }

  const raw = String(phone).trim();
  const digitsOnly = raw.replace(/\D/g, '');

  if (raw.startsWith('+971') || (digitsOnly.startsWith('971') && digitsOnly.length >= 11)) {
    return {
      country: 'AE',
      countryCode: '+971',
      nationalNumber: digitsOnly.startsWith('971') ? digitsOnly.slice(3) : digitsOnly
    };
  }

  if (raw.startsWith('+91') || (digitsOnly.startsWith('91') && digitsOnly.length >= 12)) {
    return {
      country: 'IN',
      countryCode: '+91',
      nationalNumber: digitsOnly.startsWith('91') ? digitsOnly.slice(2) : digitsOnly
    };
  }

  if (digitsOnly.length === 9 && /^5/.test(digitsOnly)) {
    return {
      country: 'AE',
      countryCode: '+971',
      nationalNumber: digitsOnly
    };
  }

  return {
    country: defaultCountry,
    countryCode: defaultCountry === 'AE' ? '+971' : '+91',
    nationalNumber: digitsOnly
  };
};

const PhoneInput = ({
  id = 'phone-input',
  name = 'phone',
  value = '',
  onChange,
  onBlur,
  required = false,
  disabled = false,
  label,
  error: externalError,
  showError = true,
  defaultCountry = 'IN',
  allowedCountries = ['IN', 'AE'],
  className = '',
  inputClassName = '',
}) => {
  const filteredCountries = COUNTRIES.filter((c) => allowedCountries.includes(c.code));
  const activeDefault = filteredCountries.some((c) => c.code === defaultCountry)
    ? defaultCountry
    : filteredCountries[0]?.code || 'IN';

  const initialParsed = parsePhoneNumber(value, activeDefault);
  const initialCountryCode = filteredCountries.some((c) => c.code === initialParsed.country)
    ? initialParsed.country
    : activeDefault;

  const [selectedCountry, setSelectedCountry] = useState(initialCountryCode);
  const [digits, setDigits] = useState(initialParsed.nationalNumber || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState('');

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const activeCountryObj =
    filteredCountries.find((c) => c.code === selectedCountry) || filteredCountries[0];

  useEffect(() => {
    if (value === undefined || value === null) {
      setDigits('');
      setInternalError('');
      return;
    }

    const parsed = parsePhoneNumber(value, selectedCountry);
    if (filteredCountries.some((c) => c.code === parsed.country) && parsed.country !== selectedCountry) {
      setSelectedCountry(parsed.country);
    }
    const cleanDigits = (parsed.nationalNumber || '').slice(0, activeCountryObj.maxLength);
    if (cleanDigits !== digits) {
      setDigits(cleanDigits);
    }
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  const runValidation = (testDigits, countryCode) => {
    if (!testDigits || !testDigits.trim()) {
      if (required) {
        return { isValid: false, message: 'Phone number is required.' };
      }
      return { isValid: true, message: '', formatted: '' };
    }

    const countryObj = filteredCountries.find((c) => c.code === countryCode) || activeCountryObj;
    const fullPhone = `${countryObj.dialCode}${testDigits}`;
    const result = validatePhoneNumber(fullPhone, { required, defaultCountry: countryCode });

    if (!result.isValid) {
      return { isValid: false, message: result.message || 'Invalid phone number.', formatted: fullPhone };
    }
    return { isValid: true, message: '', formatted: result.formatted || fullPhone };
  };

  const emitChange = (newDigits, newCountryCode, markTouched = true) => {
    const countryObj = filteredCountries.find((c) => c.code === newCountryCode) || activeCountryObj;
    const valResult = runValidation(newDigits, newCountryCode);

    if (markTouched) {
      setInternalError(valResult.isValid ? '' : valResult.message);
    }

    const fullInternational = newDigits.trim() ? `${countryObj.dialCode}${newDigits.trim()}` : '';

    if (onChange) {
      onChange(fullInternational, {
        isValid: valResult.isValid,
        country: countryObj.code,
        countryCode: countryObj.dialCode,
        nationalNumber: newDigits,
        formatted: valResult.formatted,
        error: valResult.message,
        target: { id, name, value: fullInternational },
      });
    }
  };

  const handleCountrySelect = (newCountry) => {
    setSelectedCountry(newCountry.code);
    setDropdownOpen(false);
    setTouched(true);

    let adjustedDigits = digits;
    if (newCountry.code === 'AE') {
      if (adjustedDigits.length > 9 || (adjustedDigits.length > 0 && !adjustedDigits.startsWith('5'))) {
        adjustedDigits = adjustedDigits.startsWith('5') ? adjustedDigits.slice(0, 9) : '';
      }
    } else if (newCountry.code === 'IN') {
      if (adjustedDigits.length > 10 || (adjustedDigits.length > 0 && !/^[6-9]/.test(adjustedDigits))) {
        adjustedDigits = /^[6-9]/.test(adjustedDigits) ? adjustedDigits.slice(0, 10) : '';
      }
    }

    setDigits(adjustedDigits);
    emitChange(adjustedDigits, newCountry.code, true);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Tab',
      'Home',
      'End',
      'Enter',
    ];

    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
      return;
    }

    if (allowedKeys.includes(e.key)) {
      return;
    }

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    const cleaned = rawVal.replace(/\D/g, '').slice(0, activeCountryObj.maxLength);
    setDigits(cleaned);
    setTouched(true);
    emitChange(cleaned, selectedCountry, true);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text') || '';
    const cleaned = pastedText.replace(/\D/g, '').slice(0, activeCountryObj.maxLength);
    setDigits(cleaned);
    setTouched(true);
    emitChange(cleaned, selectedCountry, true);
  };

  const handleBlur = (e) => {
    setTouched(true);
    const valResult = runValidation(digits, selectedCountry);
    setInternalError(valResult.isValid ? '' : valResult.message);
    if (onBlur) onBlur(e);
  };

  const currentError = externalError || (touched ? internalError : '');
  const hasError = Boolean(currentError);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-brand-text mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center w-full rounded border bg-white transition-all ${
          hasError
            ? 'border-red-500 ring-1 ring-red-200'
            : 'border-brand-light hover:border-neutral-400 focus-within:border-brand-gold focus-within:ring-1 focus-within:ring-brand-gold/30'
        } ${disabled ? 'bg-neutral-100 opacity-70 cursor-not-allowed' : ''}`}
      >
        <div className="relative shrink-0 border-r border-brand-light" ref={dropdownRef}>
          <button
            type="button"
            id={`${id}-country-btn`}
            disabled={disabled || filteredCountries.length <= 1}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-800 bg-neutral-50/70 hover:bg-neutral-100 rounded-l transition-colors select-none ${
              disabled || filteredCountries.length <= 1 ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <span className="text-sm leading-none" role="img" aria-label={activeCountryObj.name}>
              {activeCountryObj.flag}
            </span>
            <span className="font-semibold tracking-tight text-xs">{activeCountryObj.dialCode}</span>
            {filteredCountries.length > 1 && (
              <ChevronDown
                size={12}
                className={`text-neutral-500 transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1 w-60 bg-white border border-neutral-200 rounded shadow-xl py-1 z-50"
              role="listbox"
            >
              <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-neutral-400 uppercase border-b border-neutral-100">
                Select Country Code
              </div>
              {filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry;
                return (
                  <button
                    key={c.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-50 text-amber-900 font-semibold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none" role="img" aria-label={c.name}>
                        {c.flag}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="font-mono text-neutral-500 text-xs shrink-0 ml-2">
                      {c.dialCode}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={digits}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          maxLength={activeCountryObj.maxLength}
          disabled={disabled}
          placeholder={activeCountryObj.placeholder}
          className={`w-full px-3 py-2 text-xs font-medium text-neutral-900 bg-transparent placeholder:text-neutral-400 focus:outline-none rounded-r ${inputClassName}`}
        />
      </div>

      {showError && hasError && (
        <p className="text-[10px] text-red-500 font-medium mt-1 animate-in fade-in flex items-center gap-1">
          <span>⚠️</span>
          <span>{currentError}</span>
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
