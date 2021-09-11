import type { ApiSuccess, Page } from '../types/api';
import type { Order, OrderStatus } from '../types/orders';
import { apiClient } from './client';

export interface OrderQuery {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  search?: string;
}

export interface NewOrder {
  customerName: string;
  amount: number;
}

export async function fetchOrders(query: OrderQuery = {}): Promise<Page<Order>> {
  const response = await apiClient.get<ApiSuccess<Page<Order>>>('/orders', { params: query });
  return response.data.data;
}

export async function createOrder(order: NewOrder): Promise<Order> {
  const response = await apiClient.post<ApiSuccess<Order>>('/orders', order);
  return response.data.data;
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  const response = await apiClient.patch<ApiSuccess<Order>>(`/orders/${id}`, { status });
  return response.data.data;
}
