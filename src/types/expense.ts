export type ExpenseCategory =
  | 'cleaning'
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'maintenance'
  | 'internet'
  | 'marketing'
  | 'transport'
  | 'other';

export interface Expense {
  _id: string;
  voucherNumber: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  cashboxId: string;
  currency: string;
  spentAt: string;
  recordedBy: string;
  notes?: string | null;
  receiptImageMimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseReceipt {
  mimeType: string;
  data: string;
}

export interface FinancialSummary {
  paymentsTotal: number;
  expensesTotal: number;
  payrollTotal: number;
  cashboxBalance: number;
  netProfit?: number;
}
