export type PaymentStatus = 'completed' | 'reversed';

export interface PaymentAllocation {
  installmentId: string;
  amount: number; // fils
}

export interface Payment {
  _id: string;
  subscriptionId: string;
  studentId: string;
  cashboxId: string;
  amount: number; // fils
  currency: string;
  allocations: PaymentAllocation[];
  receiptNumber: string;
  method: string;
  status: PaymentStatus;
  paidAt: string;
  recordedBy: string;
  reversedAt?: string | null;
  reversedBy?: string | null;
  reverseReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
