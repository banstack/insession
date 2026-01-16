import type { User, Session, CreateActivityInput, SessionsResponse, ActivityProgress } from '../types';

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () => request<{ user: User }>('/auth/me'),
};

// Sessions API
export const sessionsApi = {
  create: (activities: CreateActivityInput[]) =>
    request<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ activities }),
    }),

  list: (page = 1, limit = 20) =>
    request<SessionsResponse>(`/sessions?page=${page}&limit=${limit}`),

  get: (id: string) => request<Session>(`/sessions/${id}`),

  update: (id: string, data: {
    currentActivityIndex?: number;
    elapsedSeconds?: number;
    status?: string;
    activityProgress?: ActivityProgress[];
  }) =>
    request<Session>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/sessions/${id}`, {
      method: 'DELETE',
    }),
};
