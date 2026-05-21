import { Guest, WeddingInfo } from './types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Erreur serveur (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
      else if (body.detail) message = body.detail;
      else if (body.message) message = body.message;
    } catch {
      // Could not parse JSON error body
    }
    throw new ApiError(message, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────────

export async function apiLogin(username: string, password: string): Promise<void> {
  await apiFetch<{ success: boolean }>('/admin/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function apiLogout(): Promise<void> {
  await apiFetch<{ success: boolean }>('/admin/logout/', {
    method: 'POST',
  });
}

export async function apiCheckAuth(): Promise<boolean> {
  try {
    const data = await apiFetch<{ authenticated: boolean }>('/admin/check/');
    return data.authenticated;
  } catch {
    return false;
  }
}

export async function apiChangePassword(newPassword: string): Promise<void> {
  await apiFetch<{ success: boolean }>('/admin/change-password/', {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

export async function apiGetCurrentUser(): Promise<{ username: string; firstName: string; lastName: string; email: string; isSuperuser: boolean }> {
  return apiFetch('/admin/me/');
}

export async function apiUpdateCurrentUser(data: { firstName: string; lastName: string; email: string }): Promise<{ username: string; firstName: string; lastName: string; email: string; isSuperuser: boolean }> {
  return apiFetch('/admin/me/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Guests ─────────────────────────────────────────────────────────

export async function apiGetGuests(): Promise<Guest[]> {
  return apiFetch<Guest[]>('/guests/');
}

export async function apiAddGuest(data: {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  plusOne?: boolean;
}): Promise<Guest> {
  return apiFetch<Guest>('/guests/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteGuest(id: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/guests/${id}/`, {
    method: 'DELETE',
  });
}

export async function apiGetGuestByToken(token: string): Promise<{ guest: Guest; weddingInfo: WeddingInfo } | null> {
  try {
    return await apiFetch<{ guest: Guest; weddingInfo: WeddingInfo }>(`/guests/by-token/${token}/`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

// ─── RSVP ───────────────────────────────────────────────────────────

export async function apiSubmitRSVP(
  token: string,
  data: {
    rsvpStatus: 'confirmed' | 'declined';
    numberOfGuests?: number;
    plusOneName?: string;
    dietaryRestrictions?: string;
    rsvpMessage?: string;
  }
): Promise<Guest> {
  return apiFetch<Guest>(`/rsvp/${token}/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Wedding Info ───────────────────────────────────────────────────

export async function apiGetWeddingInfo(): Promise<WeddingInfo> {
  return apiFetch<WeddingInfo>('/wedding-info/');
}

export async function apiSaveWeddingInfo(info: WeddingInfo, file?: File | null): Promise<WeddingInfo> {
  if (file || (info.coupleImage === '' && ('coupleImage' in info))) {
    const formData = new FormData();
    Object.entries(info).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    if (file) {
      formData.append('coupleImage', file);
    } else {
      formData.append('removeCoupleImage', '1');
    }
    return apiFetch<WeddingInfo>('/wedding-info/', {
      method: 'PUT',
      body: formData,
    });
  }
  return apiFetch<WeddingInfo>('/wedding-info/', {
    method: 'PUT',
    body: JSON.stringify(info),
  });
}

// ─── Utility (client-side) ──────────────────────────────────────────

export function generateInviteLink(token: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?invite=${token}`;
}

// ─── Users ───────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  dateJoined: string;
  isSuperuser: boolean;
}

export async function apiGetUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/users/');
}

export async function apiCreateUser(data: {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isSuperuser?: boolean;
}): Promise<AdminUser> {
  return apiFetch<AdminUser>('/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteUser(id: number): Promise<void> {
  await apiFetch<{ success: boolean }>(`/users/${id}/`, {
    method: 'DELETE',
  });
}
