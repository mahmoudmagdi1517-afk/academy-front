import { api } from './client';
import { Payment } from '../types/payment';

export const paymentApi = {
  listPayments: (params?: { subscriptionId?: string; studentId?: string }) =>
    api.get<Payment[]>('/api/payments', params),

  getPayment: (id: string) =>
    api.get<Payment>(`/api/payments/${id}`),

  createPayment: (data: {
    subscriptionId: string;
    cashboxId: string;
    amount: number;
    allocations?: Array<{
      installmentId: string;
      amount: number;
    }>;
    method?: string;
    notes?: string | null;
    paidAt?: string;
  }) => api.post<Payment>('/api/payments', data),

  reversePayment: (id: string, reason?: string) =>
    api.post<Payment>(`/api/payments/${id}/reverse`, { reason }),
};
