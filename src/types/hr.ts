export type SalaryType = 'fixed_monthly' | 'per_session' | 'mixed' | 'other';
export type PayrollStatus = 'draft' | 'calculated' | 'reviewed' | 'approved' | 'paid';
export type LeaveStatus = 'approved' | 'cancelled';
export type AdjustmentKind = 'bonus' | 'deduction' | 'advance';
export type EmployeeRole = 'instructor' | 'staff' | 'manager';

export interface Employee {
  _id: string;
  employeeCode: string;
  name: string;
  nameAr?: string | null;
  phone?: string | null;
  email?: string | null;
  hireDate?: string | null;
  isTeacher: boolean;
  role: EmployeeRole;
  hasUserAccount?: boolean;
  specialties?: string[];
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryConfiguration {
  _id: string;
  employeeId: string;
  type: SalaryType;
  fixedMonthly: number; // fils
  sessionRate: number; // fils
  effectiveFrom: string; // YYYY-MM-DD
  notes?: string | null;
}

export interface Payroll {
  _id: string;
  employeeId: string;
  year: number;
  month: number;
  salaryType: SalaryType;
  baseAmount: number; // fils
  sessionCount: number;
  sessionAmount: number; // fils
  adjustmentsAmount: number; // fils
  netAmount: number; // fils
  status: PayrollStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  paidBy?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  _id: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  status: LeaveStatus;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  _id: string;
  type: string;
  title?: string;
  message?: string;
  payload?: {
    groupName?: string | null;
    groupNameAr?: string | null;
    teacherName?: string | null;
    teacherNameAr?: string | null;
    currentDate?: string;
    startTime?: string;
  };
  createdAt: string;
}
