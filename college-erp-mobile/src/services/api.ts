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
export async function getApiBaseUrl(): Promise<string> {
  try {
    const custom = await SecureStore.getItemAsync('mobile_custom_api_url');
    if (custom && custom.trim()) {
      currentBaseUrl = custom.trim().replace(/\/+$/, '');
      return currentBaseUrl;
    }
  } catch {}

  // In development, detect developer machine LAN IP from Expo's Metro hostUri
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

  if (Platform.OS === 'web') {
    currentBaseUrl = 'http://127.0.0.1:5000/api';
    return currentBaseUrl;
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

  currentBaseUrl = CLOUD_API_URL;
  return currentBaseUrl;
}

export function getCurrentBaseUrl(): string {
  return currentBaseUrl;
}

export async function setCustomApiUrl(url: string | null): Promise<void> {
  if (url && url.trim()) {
    await SecureStore.setItemAsync('mobile_custom_api_url', url.trim());
    currentBaseUrl = url.trim().replace(/\/+$/, '');
  } else {
    await SecureStore.deleteItemAsync('mobile_custom_api_url');
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
 * Universal fetch with automatic failover between Local Dev server and Cloud server
 */
let isLocalServerUnreachable = false;

async function fetchWithFailover(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const primaryUrl = await getApiBaseUrl();
  const cleanPath = path.replace(/^\/+/, '');

  // If local server previously failed to respond on this session, immediately use cloud URL to avoid lag
  const targetUrl = (isLocalServerUnreachable && primaryUrl !== CLOUD_API_URL) ? CLOUD_API_URL : primaryUrl;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${targetUrl}/${cleanPath}`, {
      ...init,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (targetUrl === primaryUrl) isLocalServerUnreachable = false;
    return res;
  } catch (primaryErr: any) {
    if (targetUrl !== CLOUD_API_URL) {
      isLocalServerUnreachable = true;
      try {
        console.warn(`[API] Host ${targetUrl} unreachable (${primaryErr.message}). Failing over to Cloud URL: ${CLOUD_API_URL}`);
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
      email: email.trim().toLowerCase(),
      password: password.trim(),
    }),
  });

  const data = (await response.json()) as LoginResponse;

  if (!response.ok) {
    throw new Error(data.message || 'Login failed. Please verify credentials.');
  }

  if (!data.token || !data.role) {
    throw new Error('The server response is missing login authentication token.');
  }

  await SecureStore.setItemAsync('mobile_erp_token', data.token);
  await SecureStore.setItemAsync(
    'mobile_erp_user',
    JSON.stringify(data),
  );

  return data;
}

export async function getSavedUser(): Promise<MobileUser | null> {
  const savedUser = await SecureStore.getItemAsync('mobile_erp_user');

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
  return SecureStore.getItemAsync('mobile_erp_token');
}

export async function logoutUser(): Promise<void> {
  await SecureStore.deleteItemAsync('mobile_erp_token');
  await SecureStore.deleteItemAsync('mobile_erp_user');
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
