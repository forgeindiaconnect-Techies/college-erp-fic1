/**
 * Global Validation Helper for Indian Mobile Numbers and Email Addresses
 * Mobile Application Frontend (React Native / Expo)
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
export const cleanPhoneInput = (val: string): string => {
  if (!val) return '';
  const str = String(val).trim();

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
export const isValidMobile = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = cleanPhoneInput(phone);
  return INDIAN_MOBILE_REGEX.test(cleaned);
};

/**
 * Returns human-readable error message or empty string if valid
 */
export const getMobileValidationError = (phone: string, fieldName: string = 'Mobile number', required: boolean = true): string => {
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
export const cleanEmailInput = (val: string): string => {
  if (!val) return '';
  return String(val).toLowerCase().trim();
};

/**
 * Validates email format strictly in lowercase
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const cleaned = cleanEmailInput(email);
  return EMAIL_REGEX.test(cleaned);
};

/**
 * Returns human-readable email error message or empty string if valid
 */
export const getEmailValidationError = (email: string, fieldName: string = 'Email address', required: boolean = true): string => {
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

/**
 * Assignment Due Date and Time Formatter
 * Formats raw timestamps/ISO strings (e.g. "2026-12-01T00:00:00.000Z") into clean,
 * human-readable Date (e.g. "01 Dec 2026") and Time (e.g. "11:59 PM") strings.
 */
export interface FormattedDueDateResult {
  dateStr: string;
  timeStr: string;
  fullFormatted: string;
  isOverdue: boolean;
}

export const formatDueDateAndTime = (dueDateRaw?: any, customTime?: string): FormattedDueDateResult => {
  if (!dueDateRaw) {
    return {
      dateStr: 'Standard Term',
      timeStr: customTime || '11:59 PM',
      fullFormatted: 'Standard Term',
      isOverdue: false,
    };
  }

  try {
    const rawStr = String(dueDateRaw).trim();
    if (!rawStr) {
      return {
        dateStr: 'Standard Term',
        timeStr: customTime || '11:59 PM',
        fullFormatted: 'Standard Term',
        isOverdue: false,
      };
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let formattedDate = '';
    let formattedTime = customTime || '';
    let parsedTimestamp = 0;

    if (rawStr.includes('T')) {
      // ISO Format: "2026-12-01T00:00:00.000Z"
      const [dPart, tPart] = rawStr.split('T');
      if (dPart && dPart.includes('-')) {
        const [y, m, d] = dPart.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const dayPad = d < 10 ? `0${d}` : `${d}`;
          const monthName = months[(m - 1) % 12] || 'Term';
          formattedDate = `${dayPad} ${monthName} ${y}`;
        }
      }

      if (!formattedTime && tPart) {
        const cleanT = tPart.replace(/Z|[+-].*$/, '');
        const timeParts = cleanT.split(':').map(Number);
        if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
          const [hh, mm] = timeParts;
          if (hh !== 0 || mm !== 0) {
            const period = hh >= 12 ? 'PM' : 'AM';
            const displayH = hh % 12 === 0 ? 12 : hh % 12;
            const displayM = mm < 10 ? `0${mm}` : `${mm}`;
            formattedTime = `${displayH}:${displayM} ${period}`;
          }
        }
      }

      const dObj = new Date(rawStr);
      if (!isNaN(dObj.getTime())) {
        parsedTimestamp = dObj.getTime();
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawStr)) {
      // "2026-12-01"
      const [y, m, d] = rawStr.split('-').map(Number);
      const dayPad = d < 10 ? `0${d}` : `${d}`;
      const monthName = months[(m - 1) % 12] || 'Term';
      formattedDate = `${dayPad} ${monthName} ${y}`;
      parsedTimestamp = new Date(y, m - 1, d, 23, 59, 59).getTime();
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawStr)) {
      // "01/12/2026"
      const [d, m, y] = rawStr.split('/').map(Number);
      const dayPad = d < 10 ? `0${d}` : `${d}`;
      const monthName = months[(m - 1) % 12] || 'Term';
      formattedDate = `${dayPad} ${monthName} ${y}`;
      parsedTimestamp = new Date(y, m - 1, d, 23, 59, 59).getTime();
    } else {
      const dObj = new Date(rawStr);
      if (!isNaN(dObj.getTime())) {
        const d = dObj.getDate();
        const m = dObj.getMonth();
        const y = dObj.getFullYear();
        const dayPad = d < 10 ? `0${d}` : `${d}`;
        formattedDate = `${dayPad} ${months[m]} ${y}`;
        parsedTimestamp = dObj.getTime();
        const hh = dObj.getHours();
        const mm = dObj.getMinutes();
        if ((hh !== 0 || mm !== 0) && !formattedTime) {
          const period = hh >= 12 ? 'PM' : 'AM';
          const displayH = hh % 12 === 0 ? 12 : hh % 12;
          const displayM = mm < 10 ? `0${mm}` : `${mm}`;
          formattedTime = `${displayH}:${displayM} ${period}`;
        }
      } else {
        formattedDate = rawStr;
      }
    }

    if (!formattedDate) {
      formattedDate = 'Standard Term';
    }
    if (!formattedTime) {
      formattedTime = '11:59 PM';
    }

    const now = Date.now();
    const isOverdue = parsedTimestamp > 0 && parsedTimestamp < now;

    return {
      dateStr: formattedDate,
      timeStr: formattedTime,
      fullFormatted: `${formattedDate} • ${formattedTime}`,
      isOverdue,
    };
  } catch {
    return {
      dateStr: String(dueDateRaw),
      timeStr: customTime || '11:59 PM',
      fullFormatted: String(dueDateRaw),
      isOverdue: false,
    };
  }
};


