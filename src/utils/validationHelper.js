/**
 * Global Validation Helper for Indian Mobile Numbers and Email Addresses
 * Web Application Frontend
 *
 * Rules:
 * 1. Mobile Number:
 *    - Must contain exactly 10 digits.
 *    - Must start with 6, 7, 8, or 9.
 *    - Numbers starting with 1, 2, 3, 4, or 5 are strictly prohibited.
 *    - No alphabets, special characters, or spaces.
 *    - Maximum 10 digits.
 *
 * 2. Email Address:
 *    - Must be stored and displayed in lowercase only.
 *    - Automatically convert entered uppercase letters to lowercase.
 *    - Valid email structure (user@domain.tld).
 */

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/**
 * Sanitizes phone input in real-time as user types:
 * - Strips all non-digit characters (no spaces, symbols, alphabets)
 * - If user pasted with +91 or leading 0, strips it cleanly if followed by 6-9
 * - Limits length strictly to 10 digits
 */
export const cleanPhoneInput = (val) => {
  if (!val) return '';
  let str = String(val).trim();

  // Strip all non-digit characters
  let digits = str.replace(/\D/g, '');

  // Handle +91 or 91 country code prefix if pasted
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    digits = digits.slice(1);
  }

  // Cap at 10 digits max
  return digits.slice(0, 10);
};

/**
 * Validates if the phone number is a strictly valid 10-digit Indian mobile number
 */
export const isValidMobile = (phone) => {
  if (!phone) return false;
  const cleaned = cleanPhoneInput(phone);
  return INDIAN_MOBILE_REGEX.test(cleaned);
};

/**
 * Returns human-readable error message or empty string if valid
 */
export const getMobileValidationError = (phone, fieldName = 'Mobile number', required = true) => {
  if (!phone || !String(phone).trim()) {
    if (!required) return '';
    return `${fieldName} is required.`;
  }

  const raw = String(phone).trim();
  if (/[a-zA-Z]/.test(raw)) {
    return `${fieldName} must contain numbers only without alphabets or special characters.`;
  }

  const cleaned = cleanPhoneInput(raw);

  if (cleaned.length === 0) {
    if (!required) return '';
    return `${fieldName} is required.`;
  }

  if (!/^[6-9]/.test(cleaned)) {
    return `${fieldName} must start with 6, 7, 8, or 9 (numbers starting with 1, 2, 3, 4, or 5 are not accepted).`;
  }

  if (cleaned.length !== 10) {
    return `${fieldName} must contain exactly 10 digits (currently ${cleaned.length} digit${cleaned.length === 1 ? '' : 's'}).`;
  }

  return '';
};

/**
 * Sanitizes email input in real-time:
 * - Converts all uppercase letters to lowercase automatically
 * - Trims leading/trailing whitespace
 */
export const cleanEmailInput = (val) => {
  if (!val) return '';
  return String(val).toLowerCase().trim();
};

/**
 * Validates email format strictly in lowercase
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = cleanEmailInput(email);
  return EMAIL_REGEX.test(cleaned);
};

/**
 * Returns human-readable email error message or empty string if valid
 */
export const getEmailValidationError = (email, fieldName = 'Email address', required = true) => {
  if (!email || !String(email).trim()) {
    if (!required) return '';
    return `${fieldName} is required.`;
  }

  const cleaned = cleanEmailInput(email);

  if (!EMAIL_REGEX.test(cleaned)) {
    return `Please enter a valid ${fieldName.toLowerCase()} (e.g. user@institution.edu).`;
  }

  return '';
};

