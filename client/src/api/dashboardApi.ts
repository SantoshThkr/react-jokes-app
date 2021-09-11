import type { ApiSuccess } from '../types/api';
import type { DashboardSummary, ServiceName, ServiceState, SystemStatus } from '../types/dashboard';
import { apiClient } from './client';

export async function fetchSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<ApiSuccess<DashboardSummary>>('/dashboard/summary');
  return response.data.data;
}

export async function fetchSystemStatus(): Promise<SystemStatus[]> {
  const response = await apiClient.get<ApiSuccess<SystemStatus[]>>('/system-status');
  return response.data.data;
}

export async function updateSystemStatus(
  service: ServiceName,
  status: ServiceState,
): Promise<SystemStatus> {
  const response = await apiClient.put<ApiSuccess<SystemStatus>>(`/system-status/${service}`, {
    status,
  });
  return response.data.data;
}
