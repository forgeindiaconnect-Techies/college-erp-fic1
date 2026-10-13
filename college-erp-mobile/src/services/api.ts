import * as SecureStore from 'expo-secure-store';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.10:5000/api';

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

export async function loginUser(
  email: string,
  password: string,
): Promise<MobileUser> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
    throw new Error(data.message || 'Login failed. Please try again.');
  }

  if (!data.token || !data.role) {
    throw new Error('The server response is missing login information.');
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

  const response = await fetch(
    `${API_BASE_URL}/${path.replace(/^\/+/, '')}`,
    {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Unable to load ERP data.');
  }

  return data as T;
}
