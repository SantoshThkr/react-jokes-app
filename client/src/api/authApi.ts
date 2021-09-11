import type { ApiSuccess } from '../types/api';
import type { AuthResponse, LoginCredentials, RegisterDetails, User } from '../types/auth';
import { apiClient } from './client';

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient.post<ApiSuccess<AuthResponse>>('/auth/login', credentials);
  return response.data.data;
}

export async function register(details: RegisterDetails): Promise<AuthResponse> {
  const response = await apiClient.post<ApiSuccess<AuthResponse>>('/auth/register', details);
  return response.data.data;
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await apiClient.get<ApiSuccess<{ user: User }>>('/auth/me');
  return response.data.data.user;
}
