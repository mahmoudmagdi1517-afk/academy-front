export type CashboxType = 'cash' | 'bank';
export type TreasuryTransactionKind =
  | 'opening_balance'
  | 'deposit'
  | 'income'
  | 'expense'
  | 'payroll'
  | 'payment_reversal';

export interface Cashbox {
  _id: string;
  name: string;
  type: CashboxType;
  currency: string;
  openingBalance: number;
  balance: number;
  isActive: boolean;
}

export interface TreasuryTransaction {
  _id: string;
  cashboxId: Cashbox | string;
  kind: TreasuryTransactionKind;
  amount: number;
  description: string;
  source?: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface TreasurySummary {
  cashboxes: Cashbox[];
  totalBalance: number;
  recentTransactions: TreasuryTransaction[];
}
