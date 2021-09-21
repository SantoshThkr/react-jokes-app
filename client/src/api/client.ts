import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types/api';
import { tokenStorage } from '../utils/tokenStorage';

/** Empty in development/Docker (same-origin via proxy); set VITE_API_URL for a separate API host. */
export const API_ORIGIN = import.meta.env.VITE_API_URL ?? '';

export const apiClient = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((request) => {
  const token = tokenStorage.get();
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

let unauthorizedHandler: (() => void) | null = null;

/** Called when an authenticated request is rejected with 401 (expired/revoked session). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (
    error instanceof AxiosError &&
    error.response?.status === 401 &&
    error.config?.headers?.Authorization
  ) {
    unauthorizedHandler?.();
  }
  return Promise.reject(error);
});

/** A user-presentable message for any error thrown by the API layer. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof AxiosError) {
    const body = error.response?.data as Partial<ApiErrorBody> | undefined;
    if (body?.error) {
      // Validation errors: the first field-level message is the most useful.
      return body.error.details?.[0]?.message ?? body.error.message;
    }
    if (!error.response) {
      return 'Unable to reach the server. Check your connection and try again.';
    }
  }
  return fallback;
}
