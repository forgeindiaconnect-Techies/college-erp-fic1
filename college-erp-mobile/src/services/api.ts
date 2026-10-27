import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const CLOUD_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://college-erp-software.onrender.com/api';

// Track active base URL for synchronous reads
let currentBaseUrl: string = CLOUD_API_URL;

export type MobileUser = {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  collegeId: string | null;
  tenantId: string | null;
  department?: string;
  referenceId?: string;
  studentId?: string | null;
  parentOf?: string | null;
  collegeName?: string;
  phone?: string;
  token: string;
};

type LoginResponse = MobileUser & {
  message?: string;
  success?: boolean;
};

/**
 * Resolves the optimal API base URL:
 * 1. Custom URL set by the user in settings
 * 2. Local backend on Developer's machine LAN IP (detected via Expo bundler hostUri) on port 5000
 * 3. Android Emulator (10.0.2.2:5000) or Web (127.0.0.1:5000)
 * 4. Fallback to Cloud / Configured URL
 */
// Robust in-memory storage fallback
const memoryStore: Record<string, string> = {};

/**
 * Universal cross-platform storage adapter supporting Web (localStorage/sessionStorage)
 * and Native (Expo SecureStore with graceful memory fallback)
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          const val = localStorage.getItem(key) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null);
          if (val) return val;
        }
      } catch {}
      return memoryStore[key] || null;
    }
    try {
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const isAvail = typeof SecureStore.isAvailableAsync === 'function' ? await SecureStore.isAvailableAsync().catch(() => false) : true;
        if (isAvail) {
          return await SecureStore.getItemAsync(key);
        }
      }
    } catch {}
    return memoryStore[key] || null;
  },
  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
          if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    try {
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        const isAvail = typeof SecureStore.isAvailableAsync === 'function' ? await SecureStore.isAvailableAsync().catch(() => false) : true;
        if (isAvail) {
          await SecureStore.setItemAsync(key, value);
        }
      }
    } catch {}
  },
  async deleteItem(key: string): Promise<void> {
    delete memoryStore[key];
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
        }
      } catch {}
      return;
    }
    try {
      if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
        const isAvail = typeof SecureStore.isAvailableAsync === 'function' ? await SecureStore.isAvailableAsync().catch(() => false) : true;
        if (isAvail) {
          await SecureStore.deleteItemAsync(key);
        }
      }
    } catch {}
  },
};

/**
 * Resolves the optimal API base URL:
 * 1. Custom URL set by the user in settings
 * 2. Web browser: directly to http://${hostname}:5000/api (same machine as local backend)
 * 3. Mobile Device / Emulator: detected via Metro bundler hostUri or Android 10.0.2.2
 * 4. Fallback to Cloud / Configured URL
 */
export async function getApiBaseUrl(): Promise<string> {
  try {
    const custom = await storage.getItem('mobile_custom_api_url');
    if (custom && custom.trim()) {
      currentBaseUrl = custom.trim().replace(/\/+$/, '');
      return currentBaseUrl;
    }
  } catch {}

  // 1. Web environment (Browser): always connect to localhost:5000/api
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    const host = (typeof window !== 'undefined' && window.location?.hostname) ? window.location.hostname : 'localhost';
    currentBaseUrl = `http://${host}:5000/api`;
    return currentBaseUrl;
  }

  // 2. In development, detect developer machine LAN IP from Expo's Metro hostUri
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      currentBaseUrl = `http://${hostIp}:5000/api`;
      return currentBaseUrl;
    }
  }

  if (Platform.OS === 'android') {
    // If running on an emulator without hostUri
    currentBaseUrl = 'http://10.0.2.2:5000/api';
    return currentBaseUrl;
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    currentBaseUrl = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    return currentBaseUrl;
  }

  currentBaseUrl = 'http://127.0.0.1:5000/api';
  return currentBaseUrl;
}

export function getCurrentBaseUrl(): string {
  return currentBaseUrl;
}

export async function setCustomApiUrl(url: string | null): Promise<void> {
  if (url && url.trim()) {
    await storage.setItem('mobile_custom_api_url', url.trim());
    currentBaseUrl = url.trim().replace(/\/+$/, '');
  } else {
    await storage.deleteItem('mobile_custom_api_url');
    await getApiBaseUrl();
  }
}

/**
 * Tests connection to a given or resolved backend URL
 */
export async function testApiConnection(testUrl?: string): Promise<{ ok: boolean; url: string; latencyMs: number; message: string }> {
  const targetUrl = (testUrl || (await getApiBaseUrl())).replace(/\/+$/, '');
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${targetUrl}/settings`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const latencyMs = Date.now() - startTime;
    return {
      ok: res.status < 500,
      url: targetUrl,
      latencyMs,
      message: res.ok ? 'Connected successfully' : `Server responded with status ${res.status}`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      url: targetUrl,
      latencyMs,
      message: err.name === 'AbortError' ? 'Connection timed out' : err.message || 'Cannot reach server',
    };
  }
}

/**
 * Universal fetch connecting reliably to backend
 */
async function fetchWithFailover(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const primaryUrl = await getApiBaseUrl();
  const cleanPath = path.replace(/^\/+/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${primaryUrl}/${cleanPath}`, {
      ...init,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    return res;
  } catch (primaryErr: any) {
    // If localhost failed and on web, try 127.0.0.1 fallback
    if (primaryUrl.includes('localhost')) {
      try {
        const fallbackUrl = primaryUrl.replace('localhost', '127.0.0.1');
        const altRes = await fetch(`${fallbackUrl}/${cleanPath}`, init);
        return altRes;
      } catch {}
    }

    if (primaryUrl !== CLOUD_API_URL && process.env.EXPO_PUBLIC_API_URL) {
      try {
        console.warn(`[API] Host ${primaryUrl} unreachable. Falling back to: ${CLOUD_API_URL}`);
        const cloudRes = await fetch(`${CLOUD_API_URL}/${cleanPath}`, init);
        return cloudRes;
      } catch (cloudErr) {
        throw primaryErr;
      }
    }
    throw primaryErr;
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<MobileUser> {
  const response = await fetchWithFailover('auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      password: password.trim(),
    }),
  });

  const data = (await response.json()) as LoginResponse;

  if (!response.ok) {
    let friendlyMessage = data.message || 'Login failed. Please verify your credentials.';
    if (friendlyMessage.includes('[DEBUG]') || friendlyMessage.toLowerCase().includes('password mismatch') || friendlyMessage.toLowerCase().includes('not found')) {
      friendlyMessage = 'Invalid credentials. Please check your College Email/ID and Password.';
    }
    throw new Error(friendlyMessage);
  }

  if (!data.token || !data.role) {
    throw new Error('Authentication error: The server response is missing a valid security token or role.');
  }

  // Purge any stale tokens before writing new credentials
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    try {
      const allRoleKeys = [
        'superadmin', 'admin', 'subadmin', 'principal', 'hod', 'staff',
        'student', 'parent', 'accounts', 'driver', 'hostel', 'watchman',
        'librarian', 'placement'
      ];
      allRoleKeys.forEach((k) => {
        sessionStorage.removeItem(`${k}_token`);
        sessionStorage.removeItem(`${k}_session`);
        localStorage.removeItem(`${k}_token`);
        localStorage.removeItem(`${k}_session`);
      });
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('active_role');
      sessionStorage.removeItem('tenantId');
      localStorage.removeItem('token');
      localStorage.removeItem('active_role');
      localStorage.removeItem('role');
    } catch {}
  }

  await storage.setItem('mobile_erp_token', data.token);
  await storage.setItem('mobile_erp_user', JSON.stringify(data));

  // Sync to web storage keys so web and mobile share auth seamlessly
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    try {
      const roleKey = (data.role || '').toLowerCase().replace(/\s+/g, '');
      sessionStorage.setItem(`${roleKey}_token`, data.token);
      sessionStorage.setItem(`${roleKey}_session`, JSON.stringify(data));
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('active_role', data.role);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem(`${roleKey}_token`, data.token);
      localStorage.setItem(`${roleKey}_session`, JSON.stringify(data));
      if (data.tenantId || data.collegeId) {
        sessionStorage.setItem('tenantId', data.tenantId || data.collegeId || '');
        localStorage.setItem('tenantId', data.tenantId || data.collegeId || '');
      }
    } catch {}
  }

  return data;
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetchWithFailover('auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Unable to send reset instructions. Please check your email.');
  }

  return data.message || 'Password reset instructions have been dispatched to your email.';
}

export async function getSavedUser(): Promise<MobileUser | null> {
  let savedUser = await storage.getItem('mobile_erp_user');

  // Fallback to active web sessions if on browser
  if (!savedUser && (Platform.OS === 'web' || typeof window !== 'undefined')) {
    try {
      const activeRole = sessionStorage.getItem('active_role') || localStorage.getItem('role');
      if (activeRole) {
        const roleKey = activeRole.toLowerCase().replace(/\s+/g, '');
        savedUser = sessionStorage.getItem(`${roleKey}_session`) || localStorage.getItem(`${roleKey}_session`);
      }
      if (!savedUser) {
        const roleOrder = [
          'driver', 'staff', 'student', 'parent', 'librarian', 'watchman',
          'hostel', 'placement', 'hod', 'accounts', 'principal', 'admin',
          'subadmin', 'superadmin'
        ];
        for (const r of roleOrder) {
          savedUser = sessionStorage.getItem(`${r}_session`) || localStorage.getItem(`${r}_session`);
          if (savedUser) break;
        }
      }
      if (!savedUser) {
        savedUser = sessionStorage.getItem('user_session') || localStorage.getItem('user_session');
      }
    } catch {}
  }

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as MobileUser;
  } catch {
    await logoutUser();
    return null;
  }
}

export async function getAuthToken(): Promise<string | null> {
  let token = await storage.getItem('mobile_erp_token');

  // Fallback to web session tokens if on browser
  if (!token && (Platform.OS === 'web' || typeof window !== 'undefined')) {
    try {
      const activeRole = sessionStorage.getItem('active_role') || localStorage.getItem('role');
      if (activeRole) {
        const roleKey = activeRole.toLowerCase().replace(/\s+/g, '');
        token = sessionStorage.getItem(`${roleKey}_token`) || localStorage.getItem(`${roleKey}_token`);
      }
      if (!token) {
        const roleOrder = [
          'driver', 'staff', 'student', 'parent', 'librarian', 'watchman',
          'hostel', 'placement', 'hod', 'accounts', 'principal', 'admin',
          'subadmin', 'superadmin'
        ];
        for (const r of roleOrder) {
          token = sessionStorage.getItem(`${r}_token`) || localStorage.getItem(`${r}_token`);
          if (token) break;
        }
      }
      if (!token) {
        token = sessionStorage.getItem('token') || localStorage.getItem('token');
      }
    } catch {}
  }

  return token;
}

export async function logoutUser(): Promise<void> {
  await storage.deleteItem('mobile_erp_token');
  await storage.deleteItem('mobile_erp_user');
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    try {
      const allRoleKeys = [
        'superadmin', 'admin', 'subadmin', 'principal', 'hod', 'staff',
        'student', 'parent', 'accounts', 'driver', 'hostel', 'watchman',
        'librarian', 'placement'
      ];
      allRoleKeys.forEach((k) => {
        sessionStorage.removeItem(`${k}_token`);
        sessionStorage.removeItem(`${k}_session`);
        localStorage.removeItem(`${k}_token`);
        localStorage.removeItem(`${k}_session`);
      });
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('active_role');
      sessionStorage.removeItem('tenantId');
      sessionStorage.removeItem('user_session');
      localStorage.removeItem('token');
      localStorage.removeItem('active_role');
      localStorage.removeItem('role');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('user_session');
    } catch {}
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await getAuthToken();
  const user = await getSavedUser();
  const tenantId = user?.tenantId || user?.collegeId;

  const response = await fetchWithFailover(path, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    },
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.message || `Unable to load ERP data (${response.status})`);
  }

  return data as T;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const token = await getAuthToken();
  const user = await getSavedUser();
  const tenantId = user?.tenantId || user?.collegeId;

  const response = await fetchWithFailover(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.message || `Action failed (${response.status})`);
  }

  return data as T;
}

export async function apiPut<T>(path: string, body?: any): Promise<T> {
  const token = await getAuthToken();
  const user = await getSavedUser();
  const tenantId = user?.tenantId || user?.collegeId;

  const response = await fetchWithFailover(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.message || `Action failed (${response.status})`);
  }

  return data as T;
}

export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const token = await getAuthToken();
  const user = await getSavedUser();
  const tenantId = user?.tenantId || user?.collegeId;

  const response = await fetchWithFailover(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.message || `Patch action failed (${response.status})`);
  }

  return data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const token = await getAuthToken();
  const user = await getSavedUser();
  const tenantId = user?.tenantId || user?.collegeId;

  const response = await fetchWithFailover(path, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    },
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.message || `Delete failed (${response.status})`);
  }

  return data as T;
}

// Pre-initialize base URL on import
getApiBaseUrl().catch(() => {});
