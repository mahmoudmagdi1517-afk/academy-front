import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Coins,
  CalendarOff,
  SlidersHorizontal,
  DollarSign,
  Phone,
  Mail,
  GraduationCap,
} from "lucide-react";
import { Employee, EmployeeRole, SalaryType, SalaryConfiguration } from "../types/hr";
import { hrApi } from "../api/hr.api";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { DataTable } from "../components/common/DataTable";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { formatQAR, qarToFils, filsToQar } from "../utils/currency";
import { formatDate, getQatarToday } from "../utils/date";

export const HRPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Employee Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [submittingEmployee, setSubmittingEmployee] = useState(false);
  const [empForm, setEmpForm] = useState({
    name: "",
    nameAr: "",
    phone: "",
    email: "",
    hireDate: getQatarToday(),
    role: "instructor" as EmployeeRole,
    specialties: "",
    notes: "",
  });

  // Salary Config Modal
  const [salaryTargetEmployee, setSalaryTargetEmployee] =
    useState<Employee | null>(null);
  const [salaryForm, setSalaryForm] = useState({
    type: "fixed_monthly" as SalaryType,
    fixedMonthlyQar: "",
    sessionRateQar: "",
    effectiveFrom: getQatarToday(),
    notes: "",
  });
  const [submittingSalary, setSubmittingSalary] = useState(false);

  // Leave Modal
  const [leaveTargetEmployee, setLeaveTargetEmployee] =
    useState<Employee | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    startDate: getQatarToday(),
    endDate: getQatarToday(),
    reason: "",
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Adjustment Modal
  const [adjustmentTargetEmployee, setAdjustmentTargetEmployee] =
    useState<Employee | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    kind: "bonus" as "bonus" | "deduction" | "advance",
    amountQar: "",
    reason: "",
  });
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await hrApi.listEmployees();
      setEmployees(data);
    } catch (err: any) {
      error(err.message || "Failed to load staff directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name.trim()) return;

    setSubmittingEmployee(true);
    try {
      const specs = empForm.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await hrApi.createEmployee({
        name: empForm.name.trim(),
        nameAr: empForm.nameAr.trim() || null,
        phone: empForm.phone.trim() || null,
        email: empForm.email.trim() || null,
        hireDate: empForm.hireDate || null,
        role: empForm.role,
        specialties: specs,
        notes: empForm.notes.trim() || null,
      });

      success("Employee profile created");
      setIsEmployeeModalOpen(false);
      setEmpForm({
        name: "",
        nameAr: "",
        phone: "",
        email: "",
        hireDate: getQatarToday(),
        role: "instructor",
        specialties: "",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to create employee");
    } finally {
      setSubmittingEmployee(false);
    }
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryTargetEmployee) return;

    setSubmittingSalary(true);
    try {
      await hrApi.setSalary(salaryTargetEmployee._id, {
        type: salaryForm.type,
        fixedMonthly: salaryForm.fixedMonthlyQar
          ? qarToFils(salaryForm.fixedMonthlyQar)
          : 0,
        sessionRate: salaryForm.sessionRateQar
          ? qarToFils(salaryForm.sessionRateQar)
          : 0,
        effectiveFrom: salaryForm.effectiveFrom,
        notes: salaryForm.notes.trim() || null,
      });

      success("Salary configuration saved");
      setSalaryTargetEmployee(null);
    } catch (err: any) {
      error(err.message || "Failed to configure salary");
    } finally {
      setSubmittingSalary(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTargetEmployee) return;

    setSubmittingLeave(true);
    try {
      await hrApi.createLeave(leaveTargetEmployee._id, {
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason.trim() || null,
      });

      success("Leave record created");
      setLeaveTargetEmployee(null);
    } catch (err: any) {
      error(err.message || "Failed to record leave");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !adjustmentTargetEmployee ||
      !adjustmentForm.amountQar ||
      !adjustmentForm.reason.trim()
    )
      return;

    setSubmittingAdjustment(true);
    try {
      await hrApi.createAdjustment(adjustmentTargetEmployee._id, {
        kind: adjustmentForm.kind,
        amount: qarToFils(adjustmentForm.amountQar),
        reason: adjustmentForm.reason.trim(),
      });

      success("Payroll adjustment logged");
      setAdjustmentTargetEmployee(null);
    } catch (err: any) {
      error(err.message || "Failed to create adjustment");
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("nav.hr")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Employee directory, instructors, salary compensation packages, and
            leaves.
          </p>
        </div>

        <button
          onClick={() => setIsEmployeeModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            title="No staff members registered"
            description="Add teachers and administrative staff to manage payroll and courses."
            icon={Users}
            actionText="Add Employee"
            onAction={() => setIsEmployeeModalOpen(true)}
          />
        ) : (
          <DataTable
            rows={employees}
            rowKey={(employee) => employee._id}
            columns={[
              {
                key: "code",
                header: "Code",
                className: "font-mono font-bold text-indigo-600",
                render: (employee) => employee.employeeCode,
              },
              {
                key: "name",
                header: "Name",
                render: (employee) => (
                  <>
                    <div className="font-bold text-slate-900">
                      {employee.name}
                    </div>
                    {employee.nameAr && (
                      <div className="text-[11px] text-slate-400 font-sans">
                        {employee.nameAr}
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: "role",
                header: "Role / Type",
                render: (employee) => (
                  <>
                    <Badge
                      variant={(employee.role || (employee.isTeacher ? "instructor" : "staff")) === "instructor" ? "primary" : (employee.role === "manager" ? "info" : "neutral")}
                      size="sm"
                    >
                      {(employee.role || (employee.isTeacher ? "instructor" : "staff")) === "instructor"
                        ? t("employee.instructor")
                        : (employee.role || "staff") === "manager"
                          ? t("employee.manager")
                          : t("employee.staff")}
                    </Badge>
                    {employee.specialties &&
                      employee.specialties.length > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                          {employee.specialties.join(", ")}
                        </div>
                      )}
                  </>
                ),
              },
              {
                key: "contact",
                header: "Contact",
                render: (employee) => (
                  <>
                    {employee.phone && (
                      <div className="flex items-center gap-1 font-mono text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.email && (
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {employee.email}
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: "hireDate",
                header: "Hire Date",
                className: "text-slate-500",
                render: (employee) => formatDate(employee.hireDate),
              },
              {
                key: "manage",
                header: "Manage",
                headerClassName: "text-center",
                className: "text-center",
                render: (employee) => (
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => {
                        setSalaryTargetEmployee(employee);
                        setSalaryForm({
                          type: "fixed_monthly",
                          fixedMonthlyQar: "",
                          sessionRateQar: "",
                          effectiveFrom: getQatarToday(),
                          notes: "",
                        });
                      }}
                      title="Configure Salary"
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition"
                    >
                      Salary
                    </button>
                    <button
                      onClick={() => {
                        setLeaveTargetEmployee(employee);
                        setLeaveForm({
                          startDate: getQatarToday(),
                          endDate: getQatarToday(),
                          reason: "",
                        });
                      }}
                      title="Record Leave"
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold transition"
                    >
                      Leave
                    </button>
                    <button
                      onClick={() => {
                        setAdjustmentTargetEmployee(employee);
                        setAdjustmentForm({
                          kind: "bonus",
                          amountQar: "",
                          reason: "",
                        });
                      }}
                      title="Bonus / Deduction"
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition"
                    >
                      Adj
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title="Add New Employee"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={empForm.name}
                onChange={(e) =>
                  setEmpForm({ ...empForm, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Name (Arabic)
              </label>
              <input
                type="text"
                dir="rtl"
                placeholder="الاسم بالعربية"
                value={empForm.nameAr}
                onChange={(e) =>
                  setEmpForm({ ...empForm, nameAr: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+974 3333 4444"
                value={empForm.phone}
                onChange={(e) =>
                  setEmpForm({ ...empForm, phone: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="teacher@academy.local"
                value={empForm.email}
                onChange={(e) =>
                  setEmpForm({ ...empForm, email: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hire Date
              </label>
              <input
                type="date"
                value={empForm.hireDate}
                onChange={(e) =>
                  setEmpForm({ ...empForm, hireDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t("employee.role")} *</label>
              <SearchableSelect
                value={empForm.role}
                onChange={(value) => setEmpForm({ ...empForm, role: value as EmployeeRole })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              >
                <option value="instructor">{t("employee.instructor")}</option>
                <option value="staff">{t("employee.staff")}</option>
                <option value="manager">{t("employee.manager")}</option>
              </SearchableSelect>
            </div>

            {empForm.role === "manager" && (
              <p className="sm:col-span-2 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                {t("employee.accountLinkHint")}
              </p>
            )}

            {empForm.role === "instructor" && (
              <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Specialties / Subjects (comma-separated)
              </label>
              <input
                type="text"
                placeholder="English, IELTS, Mathematics, Physics"
                value={empForm.specialties}
                onChange={(e) =>
                  setEmpForm({ ...empForm, specialties: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEmployeeModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingEmployee}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submittingEmployee ? "Saving..." : t("common.create")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Salary Configuration Modal */}
      <Modal
        isOpen={!!salaryTargetEmployee}
        onClose={() => setSalaryTargetEmployee(null)}
        title={`Salary Config - ${salaryTargetEmployee?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSalarySubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Salary Type *
            </label>
            <SearchableSelect
              value={salaryForm.type}
              onChange={(value) =>
                setSalaryForm({
                  ...salaryForm,
                  type: value as SalaryType,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold"
            >
              <option value="fixed_monthly">Fixed Monthly</option>
              <option value="per_session">Per Session Rate</option>
              <option value="mixed">Mixed (Base + Session Rate)</option>
              <option value="other">Other</option>
            </SearchableSelect>
          </div>

          {["fixed_monthly", "mixed"].includes(salaryForm.type) && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fixed Monthly Salary (QAR)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 8000.00"
                value={salaryForm.fixedMonthlyQar}
                onChange={(e) =>
                  setSalaryForm({
                    ...salaryForm,
                    fixedMonthlyQar: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-bold"
              />
            </div>
          )}

          {["per_session", "mixed"].includes(salaryForm.type) && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Rate Per Completed Session (QAR)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 150.00"
                value={salaryForm.sessionRateQar}
                onChange={(e) =>
                  setSalaryForm({
                    ...salaryForm,
                    sessionRateQar: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-bold"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Effective From Date *
            </label>
            <input
              type="date"
              required
              value={salaryForm.effectiveFrom}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, effectiveFrom: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSalaryTargetEmployee(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingSalary}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submittingSalary ? "Saving..." : "Apply Salary Config"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Leave Modal */}
      <Modal
        isOpen={!!leaveTargetEmployee}
        onClose={() => setLeaveTargetEmployee(null)}
        title={`Record Leave - ${leaveTargetEmployee?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={leaveForm.startDate}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, startDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={leaveForm.endDate}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, endDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Reason / Notes
            </label>
            <input
              type="text"
              placeholder="Annual leave, medical excuse..."
              value={leaveForm.reason}
              onChange={(e) =>
                setLeaveForm({ ...leaveForm, reason: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setLeaveTargetEmployee(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingLeave}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-bold disabled:opacity-50"
            >
              {submittingLeave ? "Saving..." : "Record Leave"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        isOpen={!!adjustmentTargetEmployee}
        onClose={() => setAdjustmentTargetEmployee(null)}
        title={`Payroll Adjustment - ${adjustmentTargetEmployee?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Adjustment Type *
            </label>
            <SearchableSelect
              value={adjustmentForm.kind}
              onChange={(value) =>
                setAdjustmentForm({
                  ...adjustmentForm,
                  kind: value as "bonus" | "deduction" | "advance",
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold capitalize"
            >
              <option value="bonus">Bonus (+)</option>
              <option value="deduction">Deduction (-)</option>
              <option value="advance">Salary Advance (-)</option>
            </SearchableSelect>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Amount (QAR) *
            </label>
            <input
              type="number"
              required
              step="any"
              min="1"
              placeholder="e.g. 500.00"
              value={adjustmentForm.amountQar}
              onChange={(e) =>
                setAdjustmentForm({
                  ...adjustmentForm,
                  amountQar: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t("common.reason")} *
            </label>
            <input
              type="text"
              required
              placeholder="Performance bonus, late arrival deduction..."
              value={adjustmentForm.reason}
              onChange={(e) =>
                setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAdjustmentTargetEmployee(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingAdjustment}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submittingAdjustment ? "Saving..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
