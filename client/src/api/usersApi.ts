import type { ApiSuccess, Page } from '../types/api';
import type { User } from '../types/auth';
import { apiClient } from './client';

export async function fetchUsers(query: { page?: number; pageSize?: number } = {}): Promise<Page<User>> {
  const response = await apiClient.get<ApiSuccess<Page<User>>>('/users', { params: query });
  return response.data.data;
}
