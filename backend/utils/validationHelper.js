/**
 * Validation helper for Indian mobile numbers and email addresses.
 * Requirements:
 * 1. Mobile number must start only with 6, 7, 8, or 9.
 * 2. Numbers starting with 1, 2, or 3 must not be accepted.
 * 3. Allow only valid 10-digit Indian mobile numbers.
 * 4. Email ID must be normalized to lowercase and trimmed.
 */

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const INDIAN_MOBILE_ERROR_MESSAGE = 'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9';

export const cleanMobileNumber = (phone) => {
  if (!phone) return '';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
};

export const isValidIndianMobile = (phone) => {
  if (!phone) return false;
  const cleaned = cleanMobileNumber(phone);
  return INDIAN_MOBILE_REGEX.test(cleaned);
};

export const normalizeEmail = (email) => {
  if (!email) return '';
  return String(email).trim().toLowerCase();
};

