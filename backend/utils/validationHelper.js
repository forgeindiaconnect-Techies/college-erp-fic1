/**
 * Global Validation Helper for Indian Mobile Numbers and Email Addresses
 * System-Wide Enforcement (Backend)
 *
 * Rules:
 * 1. Mobile Number:
 *    - Must contain exactly 10 digits.
 *    - Must start only with 6, 7, 8, or 9.
 *    - Numbers starting with 1, 2, 3, 4, or 5 are strictly prohibited.
 *    - No alphabets, special characters, or spaces.
 *    - Maximum 10 digits.
 *
 * 2. Email Address:
 *    - Must be stored and processed in lowercase only.
 *    - Valid email structure (user@domain.tld).
 *    - Automatically normalized to lowercase and trimmed.
 */

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export const INDIAN_MOBILE_ERROR_MESSAGE =
  'Mobile number must contain exactly 10 digits and start with 6, 7, 8, or 9 (numbers starting with 1, 2, 3, 4, or 5 are not accepted).';

export const EMAIL_ERROR_MESSAGE =
  'Please provide a valid email address in lowercase format (e.g. name@institution.edu).';

/**
 * Strips non-digits and handles standard +91 or leading 0 prefix only when followed by a valid 10-digit number.
 * Never silently truncates an arbitrary long invalid number.
 */
export const cleanMobileNumber = (phone) => {
  if (!phone) return '';
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, '');

  // Handle +91 country code prefix (12 digits starting with 91 followed by 6-9)
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return digits.slice(2);
  }

  // Handle 0 prefix (11 digits starting with 0 followed by 6-9)
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    return digits.slice(1);
  }

  return digits;
};

/**
 * Validates strictly:
 * - Exactly 10 digits
 * - Starts with 6, 7, 8, or 9
 * - Rejects any input with alphabets or special characters (other than standard +91 prefix)
 */
export const isValidIndianMobile = (phone) => {
  if (!phone) return false;
  const raw = String(phone).trim();

  // If there are alphabets, immediately reject
  if (/[a-zA-Z]/.test(raw)) return false;

  const cleaned = cleanMobileNumber(raw);
  return INDIAN_MOBILE_REGEX.test(cleaned);
};

/**
 * Detailed mobile validation with descriptive error message
 */
export const validateMobileNumber = (phone, fieldName = 'Mobile number', required = true) => {
  if (!phone || !String(phone).trim()) {
    if (!required) return { isValid: true, cleaned: '' };
    return { isValid: false, message: `${fieldName} is required.` };
  }

  const raw = String(phone).trim();

  // Reject alphabets or symbols
  if (/[a-zA-Z]/.test(raw)) {
    return {
      isValid: false,
      message: `${fieldName} must contain numbers only without alphabets or special characters.`,
    };
  }

  const cleaned = cleanMobileNumber(raw);

  if (cleaned.length !== 10) {
    return {
      isValid: false,
      message: `${fieldName} must contain exactly 10 digits (currently ${cleaned.length} digit${cleaned.length === 1 ? '' : 's'}).`,
    };
  }

  if (!/^[6-9]/.test(cleaned)) {
    return {
      isValid: false,
      message: `${fieldName} must start with 6, 7, 8, or 9 (numbers starting with 1, 2, 3, 4, or 5 are not accepted).`,
    };
  }

  return { isValid: true, cleaned };
};

/**
 * Normalizes email to lowercase and trims whitespace
 */
export const normalizeEmail = (email) => {
  if (!email) return '';
  return String(email).trim().toLowerCase();
};

/**
 * Validates email format strictly in lowercase
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return EMAIL_REGEX.test(normalized);
};

/**
 * Detailed email validation with descriptive error message
 */
export const validateEmail = (email, fieldName = 'Email address', required = true) => {
  if (!email || !String(email).trim()) {
    if (!required) return { isValid: true, normalized: '' };
    return { isValid: false, message: `${fieldName} is required.` };
  }

  const normalized = normalizeEmail(email);

  if (!EMAIL_REGEX.test(normalized)) {
    return {
      isValid: false,
      message: `Please enter a valid ${fieldName.toLowerCase()} (e.g. user@institution.edu).`,
    };
  }

  return { isValid: true, normalized };
};
