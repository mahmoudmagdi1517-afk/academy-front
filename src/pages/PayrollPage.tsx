import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Calculator,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  FileCheck,
  Send,
  Eye,
  User,
} from 'lucide-react';
import { Employee, Payroll } from '../types/hr';
import { hrApi } from '../api/hr.api';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatQAR } from '../utils/currency';
import { formatDateTime } from '../utils/date';
import { treasuryApi } from '../api/treasury.api';
import { Cashbox } from '../types/treasury';

export const PayrollPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [cashboxId, setCashboxId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [calculating, setCalculating] = useState(false);
  const [currentPayroll, setCurrentPayroll] = useState<Payroll | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Promise.all([hrApi.listEmployees(), treasuryApi.listCashboxes()])
      .then(([emps, accounts]) => {
        setEmployees(emps);
        setCashboxes(accounts);
        setCashboxId(accounts[0]?._id || '');
        if (emps.length > 0) {
          setSelectedEmployeeId(emps[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    setCalculating(true);
    try {
      const payroll = await hrApi.calculatePayroll(selectedEmployeeId, {
        year: Number(year),
        month: Number(month),
      });
      setCurrentPayroll(payroll);
      success('Payroll calculated successfully');
    } catch (err: any) {
      error(err.message || 'Failed to calculate payroll');
    } finally {
      setCalculating(false);
    }
  };

  const handleReview = async () => {
    if (!currentPayroll) return;
    setActionLoading(true);
    try {
      const updated = await hrApi.reviewPayroll(currentPayroll._id);
      setCurrentPayroll(updated);
      success('Payroll transitioned to REVIEWED');
    } catch (err: any) {
      error(err.message || 'Failed to review payroll');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!currentPayroll) return;
    setActionLoading(true);
    try {
      const updated = await hrApi.approvePayroll(currentPayroll._id);
      setCurrentPayroll(updated);
      success('Payroll APPROVED and locked');
    } catch (err: any) {
      error(err.message || 'Failed to approve payroll');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async () => {
    if (!currentPayroll) return;
    setActionLoading(true);
    try {
      if (!cashboxId) {
        error(t('treasury.noAccounts'));
        return;
      }
      const updated = await hrApi.payPayroll(currentPayroll._id, cashboxId);
      setCurrentPayroll(updated);
      success('Payroll marked PAID');
    } catch (err: any) {
      error(err.message || 'Failed to execute payroll payment');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedEmployee = employees.find((e) => e._id === selectedEmployeeId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('nav.payroll')}</h2>
        <p className="text-xs text-slate-500 mt-1">
          Automated monthly salary calculation, session allowances, and approval audit workflow.
        </p>
      </div>

      {/* Calculation control bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <form onSubmit={handleCalculate} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs items-end">
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Select Employee / Instructor *</label>
            <SearchableSelect
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.employeeCode} - {emp.name} {emp.isTeacher ? '(Teacher)' : '(Staff)'}
                </option>
              ))}
            </SearchableSelect>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Month & Year *</label>
            <div className="flex gap-2">
              <SearchableSelect
                value={month}
                onChange={(value) => setMonth(Number(value))}
                className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m < 10 ? `0${m}` : m}
                  </option>
                ))}
              </SearchableSelect>

              <SearchableSelect
                value={year}
                onChange={(value) => setYear(Number(value))}
                className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </SearchableSelect>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={calculating || !selectedEmployeeId}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>{calculating ? 'Calculating...' : 'Calculate Monthly'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Payroll Statement Card */}
      {currentPayroll ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Monthly Payroll Statement
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedEmployee?.name} — {month}/{year}
              </h3>
              <p className="text-xs text-slate-500">
                Salary Type: <span className="font-semibold uppercase">{currentPayroll.salaryType}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={
                  currentPayroll.status === 'paid'
                    ? 'success'
                    : currentPayroll.status === 'approved'
                    ? 'primary'
                    : currentPayroll.status === 'reviewed'
                    ? 'warning'
                    : 'neutral'
                }
                size="md"
              >
                Status: {currentPayroll.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold block">Base Monthly Salary</span>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                {formatQAR(currentPayroll.baseAmount)}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold block">
                Session Rate ({currentPayroll.sessionCount} sessions)
              </span>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                {formatQAR(currentPayroll.sessionAmount)}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold block">Adjustments (Net)</span>
              <p
                className={`text-base font-extrabold mt-1 ${
                  currentPayroll.adjustmentsAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatQAR(currentPayroll.adjustmentsAmount)}
              </p>
            </div>

            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <span className="text-indigo-600 font-bold block">Total Net Payable (QAR)</span>
              <p className="text-xl font-extrabold text-indigo-900 mt-1">
                {formatQAR(currentPayroll.netAmount)}
              </p>
            </div>
          </div>

          {/* Audit trail */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="font-bold text-slate-700 mb-1">Audit Trail:</div>
            {currentPayroll.reviewedAt && (
              <div>Reviewed on: {formatDateTime(currentPayroll.reviewedAt)}</div>
            )}
            {currentPayroll.approvedAt && (
              <div>Approved on: {formatDateTime(currentPayroll.approvedAt)}</div>
            )}
            {currentPayroll.paidAt && (
              <div className="text-emerald-600 font-semibold">
                Paid out on: {formatDateTime(currentPayroll.paidAt)}
              </div>
            )}
          </div>

          {/* Workflow Action Controls */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {['calculated', 'draft'].includes(currentPayroll.status) && (
              <button
                type="button"
                onClick={handleReview}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                Mark as Reviewed
              </button>
            )}

            {currentPayroll.status === 'reviewed' && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                Approve & Lock Payroll
              </button>
            )}

            {currentPayroll.status === 'approved' && (
              <>
              <SearchableSelect
                value={cashboxId}
                onChange={setCashboxId}
                disabled={!cashboxes.length}
                className="min-w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden text-xs font-semibold"
              >
                {!cashboxes.length && <option value="">{t('treasury.noAccounts')}</option>}
                {cashboxes.map((cashbox) => <option key={cashbox._id} value={cashbox._id}>{cashbox.name} — {formatQAR(cashbox.balance)}</option>)}
              </SearchableSelect>
              <button
                type="button"
                onClick={handlePay}
                disabled={actionLoading || !cashboxes.length}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                Confirm Payout (Mark Paid)
              </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No payroll calculated yet"
          description="Select an employee, month, and year above and click 'Calculate Monthly' to generate an itemized compensation statement."
          icon={Briefcase}
        />
      )}
    </div>
  );
};
