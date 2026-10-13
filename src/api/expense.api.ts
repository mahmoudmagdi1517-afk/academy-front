import { api } from './client';
import { Expense, ExpenseReceipt, FinancialSummary } from '../types/expense';

export const expenseApi = {
  listExpenses: () =>
    api.get<Expense[]>('/api/expenses'),

  createExpense: (data: {
    cashboxId: string;
    category: Expense['category'];
    description: string;
    amount: number;
    spentAt: string;
    notes?: string | null;
    receipt?: { mimeType: string; data: string };
  }) => api.post<Expense>('/api/expenses', data),

  getReceipt: (id: string) =>
    api.get<ExpenseReceipt>(`/api/expenses/${id}/receipt`),

  getFinancialSummary: () =>
    api.get<FinancialSummary>('/api/expenses/summary'),
};
