import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { validatePhoneNumber, parsePhoneNumber } from '../utils/validation';

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

/**
 * Reusable PhoneInput component strictly supporting India (+91) and UAE/Dubai (+971).
 * Features:
 * - Country dropdown (only IN & AE)
 * - Digits-only restriction on input & paste
 * - Dynamic validation & max length
 * - Automatic conversion & output in international format (+91XXXXXXXXXX / +971XXXXXXXXX)
 * - Direct inline error rendering
 */
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

  // Parse initial incoming value
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

  // Sync internal state when prop `value` changes from outside
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

  // Close dropdown on outside click
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

  // Validation function
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

  // Trigger parent change
  const emitChange = (newDigits, newCountryCode, markTouched = true) => {
    const countryObj = filteredCountries.find((c) => c.code === newCountryCode) || activeCountryObj;
    const valResult = runValidation(newDigits, newCountryCode);

    if (markTouched) {
      setInternalError(valResult.isValid ? '' : valResult.message);
    }

    const fullInternational = newDigits.trim() ? `${countryObj.dialCode}${newDigits.trim()}` : '';

    if (onChange) {
      // Pass both full international string and metadata object
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

  // Country selection change
  const handleCountrySelect = (newCountry) => {
    setSelectedCountry(newCountry.code);
    setDropdownOpen(false);
    setTouched(true);

    // Dynamic Validation / clear if doesn't satisfy newly selected country rules
    let adjustedDigits = digits;
    if (newCountry.code === 'AE') {
      // UAE must start with 5 and max 9 digits
      if (adjustedDigits.length > 9 || (adjustedDigits.length > 0 && !adjustedDigits.startsWith('5'))) {
        adjustedDigits = adjustedDigits.startsWith('5') ? adjustedDigits.slice(0, 9) : '';
      }
    } else if (newCountry.code === 'IN') {
      // India must start with 6-9 and max 10 digits
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

  // Keyboard input restriction: only allow digits and navigation keys
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

    // Allow Copy, Cut, Paste, Select All shortcuts
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
      return;
    }

    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Block non-digit keys
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Text change handler
  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    // Strip non-numeric characters and enforce max length
    const cleaned = rawVal.replace(/\D/g, '').slice(0, activeCountryObj.maxLength);

    setDigits(cleaned);
    setTouched(true);
    emitChange(cleaned, selectedCountry, true);
  };

  // Paste handler: strip letters, spaces, symbols and slice
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
        <label htmlFor={id} className="block text-xs font-semibold text-brand-text mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center w-full rounded border bg-white transition-all ${
          hasError
            ? 'border-red-500 ring-1 ring-red-200'
            : 'border-neutral-300 hover:border-neutral-400 focus-within:border-brand-gold focus-within:ring-1 focus-within:ring-brand-gold/30'
        } ${disabled ? 'bg-neutral-100 opacity-70 cursor-not-allowed' : ''}`}
      >
        {/* Country Code Dropdown Container */}
        <div className="relative shrink-0 border-r border-neutral-200" ref={dropdownRef}>
          <button
            type="button"
            id={`${id}-country-btn`}
            disabled={disabled || filteredCountries.length <= 1}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium text-neutral-800 bg-neutral-50/70 hover:bg-neutral-100 rounded-l transition-colors select-none ${
              disabled || filteredCountries.length <= 1 ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <span className="text-base leading-none" role="img" aria-label={activeCountryObj.name}>
              {activeCountryObj.flag}
            </span>
            <span className="font-semibold tracking-tight">{activeCountryObj.dialCode}</span>
            {filteredCountries.length > 1 && (
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {/* Clean Modern Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1 w-64 bg-white border border-neutral-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
              role="listbox"
            >
              <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-neutral-400 uppercase border-b border-neutral-100">
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-50/80 text-amber-900 font-semibold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none" role="img" aria-label={c.name}>
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

        {/* Numeric Mobile Input */}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="tel-national"
          value={digits}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          maxLength={activeCountryObj.maxLength}
          disabled={disabled}
          placeholder={activeCountryObj.placeholder}
          className={`w-full px-3 py-2.5 text-xs sm:text-sm font-medium text-neutral-900 bg-transparent placeholder:text-neutral-400 focus:outline-none rounded-r ${inputClassName}`}
        />
      </div>

      {/* Helper & Inline Error Feedback */}
      {showError && hasError && (
        <p className="text-[11px] text-red-500 font-medium mt-1 animate-in fade-in flex items-center gap-1">
          <span>⚠️</span>
          <span>{currentError}</span>
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
