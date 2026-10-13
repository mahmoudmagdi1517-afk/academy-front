import { api } from './client';
import { Cashbox, TreasurySummary, TreasuryTransaction } from '../types/treasury';

export const treasuryApi = {
  getSummary: () => api.get<TreasurySummary>('/api/treasury/summary'),

  listCashboxes: () => api.get<Cashbox[]>('/api/treasury/cashboxes'),

  listTransactions: () => api.get<TreasuryTransaction[]>('/api/treasury/transactions'),

  createCashbox: (data: {
    name: string;
    type: Cashbox['type'];
    openingBalance: number;
  }) => api.post<Cashbox>('/api/treasury/cashboxes', data),
};
