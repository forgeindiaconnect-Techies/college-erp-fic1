/**
 * Helper to generate universally scannable Gate Pass URLs and QR codes.
 * Ensures mobile phones scanning QR codes connect to the machine's LAN IP
 * (e.g. 192.168.1.36:5173) instead of "localhost" which triggers ERR_CONNECTION_REFUSED.
 */

// Known LAN IP of the host machine
const FALLBACK_LAN_IP = '192.168.1.36';

let cachedBaseUrl = null;

// Asynchronously sync the detected LAN IP from the backend
export const initNetworkBaseUrl = async () => {
  try {
    const res = await fetch('/api/watchman/network-info');
    if (res.ok) {
      const data = await res.json();
      if (data?.frontendBase) {
        cachedBaseUrl = data.frontendBase;
        try {
          localStorage.setItem('campus_erp_frontend_base', data.frontendBase);
          if (data.lanIp) localStorage.setItem('campus_erp_lan_ip', data.lanIp);
        } catch (_) {}
        return cachedBaseUrl;
      }
    }
  } catch (_) {}
  return null;
};

// Immediately kick off background fetch
if (typeof window !== 'undefined') {
  initNetworkBaseUrl();
}

/**
 * Returns the public / LAN accessible base URL for QR codes.
 */
export const getPublicBaseUrl = () => {
  if (typeof window === 'undefined') return `http://${FALLBACK_LAN_IP}:5173`;

  const { hostname, port, protocol } = window.location;

  // If the browser is running on localhost or 127.0.0.1, phone scans must use the LAN IP
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    try {
      const storedBase = localStorage.getItem('campus_erp_frontend_base');
      if (storedBase) return storedBase;

      const storedIp = localStorage.getItem('campus_erp_lan_ip') || FALLBACK_LAN_IP;
      const resolvedPort = port || '5173';
      return `${protocol}//${storedIp}:${resolvedPort}`;
    } catch (_) {
      return `${protocol}//${FALLBACK_LAN_IP}:${port || '5173'}`;
    }
  }

  // Already accessed via LAN IP or public domain
  return window.location.origin;
};

/**
 * Generates an official Gate Pass verification URL that opens properly on phones and desktops.
 * @param {string} code - The personId or passNumber (e.g. 'PASS-0004' or 'STF-8E6D3C')
 * @param {string} type - Optional type ('visitor' | 'student' | 'staff' | 'hod' | 'members')
 */
export const getGatePassUrl = (code, type = '') => {
  if (!code) return '';
  const base = getPublicBaseUrl();
  const cleanCode = encodeURIComponent(String(code).trim());
  const typeParam = type ? `&type=${encodeURIComponent(type)}` : '';
  return `${base}/verify-gate-pass?code=${cleanCode}${typeParam}`;
};

/**
 * Generates a clean, scannable QR Code image URL via QR Server CDN.
 */
export const getQrCodeImageUrl = (content, size = 300) => {
  if (!content) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(content)}`;
};

export default {
  getPublicBaseUrl,
  getGatePassUrl,
  getQrCodeImageUrl,
  initNetworkBaseUrl
};
