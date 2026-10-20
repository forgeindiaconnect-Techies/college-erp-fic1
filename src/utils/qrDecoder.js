/**
 * QR Code Engine & Decoding Utility for College ERP Gate Scanner
 * Provides robust QR decoding from live webcam canvas frames, image files, or BarcodeDetector API.
 */

let jsQRLoadPromise = null;

/**
 * Dynamically load jsQR library from reliable CDN with multiple fallbacks
 */
export const loadQrScannerEngine = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.jsQR) return Promise.resolve(window.jsQR);

  if (jsQRLoadPromise) return jsQRLoadPromise;

  jsQRLoadPromise = new Promise((resolve) => {
    const CDNS = [
      'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
      'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
    ];

    let currentCdnIndex = 0;

    const tryNextCdn = () => {
      if (window.jsQR) {
        resolve(window.jsQR);
        return;
      }
      if (currentCdnIndex >= CDNS.length) {
        console.warn('Could not load jsQR from CDN; will fallback to BarcodeDetector if supported.');
        resolve(null);
        return;
      }

      const script = document.createElement('script');
      script.src = CDNS[currentCdnIndex];
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        if (window.jsQR) {
          resolve(window.jsQR);
        } else {
          currentCdnIndex++;
          tryNextCdn();
        }
      };

      script.onerror = () => {
        currentCdnIndex++;
        tryNextCdn();
      };

      document.head.appendChild(script);
    };

    tryNextCdn();
  });

  return jsQRLoadPromise;
};

// Immediately initiate engine preloading in browser
if (typeof window !== 'undefined') {
  loadQrScannerEngine().catch(() => {});
}

/**
 * Decode a QR code from an HTML5 Canvas or ImageData
 */
export const decodeQrFromCanvas = async (canvas) => {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;
  if (!width || !height) return null;

  const imageData = ctx.getImageData(0, 0, width, height);

  // 1. Try jsQR first (highest cross-browser compatibility)
  if (window.jsQR) {
    try {
      const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });
      if (code && code.data && code.data.trim()) {
        return sanitizeQrPayload(code.data.trim());
      }
    } catch (e) {
      console.warn('jsQR decode error:', e);
    }
  }

  // 2. Fallback to native BarcodeDetector if available
  if ('BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(canvas);
      if (barcodes && barcodes.length > 0) {
        const val = barcodes[0].rawValue;
        if (val && val.trim()) {
          return sanitizeQrPayload(val.trim());
        }
      }
    } catch (_) {}
  }

  return null;
};

/**
 * Decode a QR code from an Image File (uploaded via input type="file")
 */
export const decodeQrFromFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          await loadQrScannerEngine();
          const decoded = await decodeQrFromCanvas(canvas);
          resolve(decoded);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Clean & extract the target Person ID or Code from raw QR code text
 */
export const sanitizeQrPayload = (raw) => {
  if (!raw) return '';
  let str = raw.trim();

  // If payload is a URL (e.g. https://domain/verify?code=STU-1001 or ?id=STU-1001)
  if (str.includes('?code=') || str.includes('&code=')) {
    const match = str.match(/[?&]code=([^&#]+)/);
    if (match && match[1]) str = decodeURIComponent(match[1]).trim();
  } else if (str.includes('?id=') || str.includes('&id=')) {
    const match = str.match(/[?&]id=([^&#]+)/);
    if (match && match[1]) str = decodeURIComponent(match[1]).trim();
  }

  // If payload is JSON (e.g. {"personId": "STU-1001", "name": "..."})
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      str = obj.personId || obj.studentId || obj.passNumber || obj.id || obj.code || str;
    } catch (_) {}
  }

  // Remove quotes or legacy prefixes
  str = str.replace(/^["']|["']$/g, '').trim();
  str = str.replace(/^STU-QR-/i, '').trim();

  return str;
};

/**
 * Play a crisp audio beep on successful scan using Web Audio API (0 dependencies)
 */
export const playScanBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz (A5)
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
};
