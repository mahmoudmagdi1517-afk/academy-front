import { api } from './client';
import { Employee, EmployeeRole, Leave, NotificationItem, Payroll, SalaryConfiguration } from '../types/hr';

export const hrApi = {
  // Employees
  listEmployees: () =>
    api.get<Employee[]>('/api/hr/employees'),

  createEmployee: (data: {
    employeeCode?: string;
    name: string;
    nameAr?: string | null;
    phone?: string | null;
    email?: string | null;
    hireDate?: string | null;
    role: EmployeeRole;
    specialties?: string[];
    notes?: string | null;
  }) => api.post<Employee>('/api/hr/employees', data),

  // Salary
  setSalary: (
    employeeId: string,
    data: {
      type: string;
      fixedMonthly?: number;
      sessionRate?: number;
      effectiveFrom: string;
      notes?: string | null;
    }
  ) => api.post<SalaryConfiguration>(`/api/hr/employees/${employeeId}/salary`, data),

  // Payroll
  calculatePayroll: (employeeId: string, data: { year: number; month: number }) =>
    api.post<Payroll>(`/api/hr/employees/${employeeId}/payroll/calculate`, data),

  getPayroll: (payrollId: string) =>
    api.get<Payroll>(`/api/hr/payrolls/${payrollId}`),

  reviewPayroll: (payrollId: string) =>
    api.post<Payroll>(`/api/hr/payrolls/${payrollId}/review`),

  approvePayroll: (payrollId: string) =>
    api.post<Payroll>(`/api/hr/payrolls/${payrollId}/approve`),

  payPayroll: (payrollId: string, cashboxId: string) =>
    api.post<Payroll>(`/api/hr/payrolls/${payrollId}/pay`, { cashboxId }),

  // Adjustments
  createAdjustment: (
    employeeId: string,
    data: {
      kind: 'bonus' | 'deduction' | 'advance';
      amount: number;
      reason: string;
    }
  ) => api.post(`/api/hr/employees/${employeeId}/adjustments`, data),

  approveAdjustment: (adjustmentId: string) =>
    api.post(`/api/hr/adjustments/${adjustmentId}/approve`),

  // Leaves
  listLeaves: (employeeId: string) =>
    api.get<Leave[]>(`/api/hr/employees/${employeeId}/leaves`),

  createLeave: (
    employeeId: string,
    data: {
      startDate: string;
      endDate: string;
      reason?: string | null;
    }
  ) => api.post<Leave>(`/api/hr/employees/${employeeId}/leaves`, data),

  // Notifications
  listNotifications: () =>
    api.get<NotificationItem[]>('/api/hr/notifications'),

  // Daily Cron Trigger
  runDailyJobsNow: () =>
    api.post<{ success: boolean; data: any }>('/api/hr/jobs/run-daily'),
};
