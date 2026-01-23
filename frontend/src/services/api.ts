import type { User, Session, CreateActivityInput, SessionsResponse, ActivityProgress, Label, LabelsResponse } from '../types';

// Use environment variable for production, fallback to /api/v1 for local dev (Vite proxy)
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
const TOKEN_KEY = 'insession_token';

// Token management
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = tokenStorage.get();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/login', {
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

  addActivities: (id: string, activities: CreateActivityInput[]) =>
    request<Session>(`/sessions/${id}/activities`, {
      method: 'POST',
      body: JSON.stringify({ activities }),
    }),

  reorderActivities: (id: string, activityIds: string[]) =>
    request<Session>(`/sessions/${id}/activities/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ activityIds }),
    }),

  deleteActivity: (sessionId: string, activityId: string) =>
    request<Session>(`/sessions/${sessionId}/activities/${activityId}`, {
      method: 'DELETE',
    }),
};

// Labels API
export const labelsApi = {
  list: () => request<LabelsResponse>('/labels'),

  upsert: (color: string, name: string) =>
    request<Label>('/labels', {
      method: 'PUT',
      body: JSON.stringify({ color, name }),
    }),

  delete: (color: string) =>
    request<void>(`/labels/${encodeURIComponent(color)}`, {
      method: 'DELETE',
    }),

  getUnlinkedCount: (color: string) =>
    request<{ count: number }>(`/labels/${encodeURIComponent(color)}/unlinked-count`),

  backfill: (color: string) =>
    request<{ updatedCount: number }>(`/labels/${encodeURIComponent(color)}/backfill`, {
      method: 'POST',
    }),
};
