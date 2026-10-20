import React, { useEffect, useState } from "react";
import {
  FileCheck,
  Plus,
  ArrowRightLeft,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Course,
  Group,
  Student,
  Subscription,
  Installment,
} from "../types/academic";
import { academicApi } from "../api/academic.api";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { DataTable } from "../components/common/DataTable";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { formatQAR, qarToFils, filsToQar } from "../utils/currency";
import { formatDate, getQatarToday } from "../utils/date";
import { treasuryApi } from "../api/treasury.api";
import { Cashbox } from "../types/treasury";

export const SubscriptionsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const { hasRole } = useAuth();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [initialPaymentCashboxId, setInitialPaymentCashboxId] = useState("");
  const [loading, setLoading] = useState(true);

  // New Subscription Modal
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [customPriceQar, setCustomPriceQar] = useState("");
  const [initialPaymentQar, setInitialPaymentQar] = useState("0");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("cash");
  const [initialPaymentNotes, setInitialPaymentNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState<
    Array<{ dueDate: string; amountQar: string }>
  >([{ dueDate: getQatarToday(), amountQar: "" }]);

  // Transfer Group Modal
  const [transferModalSub, setTransferModalSub] = useState<Subscription | null>(
    null,
  );
  const [transferNewGroupId, setTransferNewGroupId] = useState("");
  const [transferring, setTransferring] = useState(false);

  // View / Modify Plan Modal
  const [viewPlanSub, setViewPlanSub] = useState<Subscription | null>(null);
  const [isModifyingPlan, setIsModifyingPlan] = useState(false);
  const [modifyReason, setModifyReason] = useState("");
  const [unpaidRowsEdit, setUnpaidRowsEdit] = useState<
    Array<{
      _id?: string;
      dueDate: string;
      amountQar: string;
      paidAmount: number;
    }>
  >([]);
  const [modifyingPlanLoading, setModifyingPlanLoading] = useState(false);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, studentsData, coursesData, groupsData, cashboxData] =
        await Promise.all([
          academicApi.listSubscriptions(),
          academicApi.listStudents(),
          academicApi.listCourses(),
          academicApi.listGroups(),
          treasuryApi.listCashboxes(),
        ]);
      setSubscriptions(subsData);
      setStudents(studentsData);
      setCourses(coursesData);
      setGroups(groupsData);
      setCashboxes(cashboxData);
      setInitialPaymentCashboxId((current) => current || cashboxData[0]?._id || "");
    } catch (err: any) {
      error(err.message || "Failed to load enrollment records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update default price when course changes
  useEffect(() => {
    if (selectedCourseId) {
      const course = courses.find((c) => c._id === selectedCourseId);
      if (course) {
        const qar = filsToQar(course.defaultPrice).toString();
        setCustomPriceQar(qar);
        const remaining = Math.max(
          0,
          course.defaultPrice - qarToFils(initialPaymentQar),
        );
        setInstallments([
          {
            dueDate: getQatarToday(),
            amountQar: filsToQar(remaining).toFixed(2),
          },
        ]);
      }
    }
  }, [selectedCourseId, courses]);

  // Installment plan helpers
  const rescaleInstallments = (
    rows: Array<{ dueDate: string; amountQar: string }>,
    targetAmount: number,
  ) => {
    const parts = rows.map((row) => qarToFils(row.amountQar));
    const currentTotal = parts.reduce((sum, amount) => sum + amount, 0);
    const scaledParts =
      currentTotal > 0
        ? parts.map((amount) => Math.floor((amount * targetAmount) / currentTotal))
        : parts.map(() => 0);
    const remainder = targetAmount - scaledParts.reduce((sum, amount) => sum + amount, 0);
    if (scaledParts.length > 0) {
      scaledParts[0] += remainder;
    }
    return rows.map((row, index) => ({
      ...row,
      amountQar: filsToQar(scaledParts[index]).toFixed(2),
    }));
  };

  const remainingInstallmentBalance = Math.max(
    0,
    qarToFils(customPriceQar) - qarToFils(initialPaymentQar),
  );

  const generateInstallments = (count: number) => {
    const totalFils = remainingInstallmentBalance;
    if (totalFils <= 0) return;

    const baseAmount = Math.floor(totalFils / count);
    const remainder = totalFils - baseAmount * count;

    const rows: Array<{ dueDate: string; amountQar: string }> = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() + i);
      const dueDate = date.toISOString().split("T")[0];
      const amount = i === 0 ? baseAmount + remainder : baseAmount;
      rows.push({ dueDate, amountQar: filsToQar(amount).toFixed(2) });
    }
    setInstallments(rows);
  };

  const handleAddInstallmentRow = () => {
    setInstallments([
      ...installments,
      { dueDate: getQatarToday(), amountQar: "" },
    ]);
  };

  const handleRemoveInstallmentRow = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId || !selectedGroupId) return;

    const priceFils = qarToFils(customPriceQar);
    const initialPaymentFils = qarToFils(initialPaymentQar);
    if (initialPaymentFils < 0 || initialPaymentFils > priceFils) {
      error("Initial payment must be between zero and the agreed price");
      return;
    }
    if (initialPaymentFils > 0 && !initialPaymentCashboxId) {
      error(t('treasury.noAccounts'));
      return;
    }

    const instPayload = installments.map((row) => ({
      dueDate: row.dueDate,
      amount: qarToFils(row.amountQar),
    }));

    const sumInst = instPayload.reduce((s, i) => s + i.amount, 0);
    const remainingInstallmentsFils = priceFils - initialPaymentFils;
    if (sumInst !== remainingInstallmentsFils) {
      error(
        `Total installments (${formatQAR(sumInst)}) must match the remaining balance (${formatQAR(remainingInstallmentsFils)})`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await academicApi.subscribe({
        studentId: selectedStudentId,
        courseId: selectedCourseId,
        groupId: selectedGroupId,
        price: priceFils,
        installments: instPayload,
        notes: notes.trim() || null,
        initialPayment:
          initialPaymentFils > 0
            ? {
                amount: initialPaymentFils,
                cashboxId: initialPaymentCashboxId,
                method: initialPaymentMethod,
                notes: initialPaymentNotes.trim() || null,
              }
            : undefined,
      });

      success(
        initialPaymentFils > 0
          ? "Student enrolled and payment receipt created successfully"
          : "Student enrolled successfully",
      );
      setIsSubscribeOpen(false);
      setSelectedStudentId("");
      setSelectedCourseId("");
      setSelectedGroupId("");
      setCustomPriceQar("");
      setInitialPaymentQar("0");
      setInitialPaymentMethod("cash");
      setInitialPaymentNotes("");
      setNotes("");
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to enroll student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalSub || !transferNewGroupId) return;

    setTransferring(true);
    try {
      await academicApi.transferGroup(transferModalSub._id, transferNewGroupId);
      success("Student transferred to new group");
      setTransferModalSub(null);
      setTransferNewGroupId("");
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to transfer group");
    } finally {
      setTransferring(false);
    }
  };

  const openModifyPlan = (sub: Subscription) => {
    setViewPlanSub(sub);
    setIsModifyingPlan(true);
    setModifyReason("");
    const unpaid = sub.installments.filter((i) => i.status !== "paid");
    setUnpaidRowsEdit(
      unpaid.map((i) => ({
        _id: i._id,
        dueDate: i.dueDate,
        amountQar: filsToQar(i.amount).toString(),
        paidAmount: i.paidAmount,
      })),
    );
  };

  const handleSaveModifiedPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewPlanSub || !modifyReason.trim()) return;

    setModifyingPlanLoading(true);
    try {
      const payloadRows = unpaidRowsEdit.map((r) => ({
        _id: r._id,
        dueDate: r.dueDate,
        amount: qarToFils(r.amountQar),
        paidAmount: r.paidAmount,
      }));

      await academicApi.modifyPlan(viewPlanSub._id, {
        reason: modifyReason.trim(),
        unpaidRows: payloadRows,
      });

      success("Installment plan updated successfully");
      setIsModifyingPlan(false);
      setViewPlanSub(null);
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to modify installment plan");
    } finally {
      setModifyingPlanLoading(false);
    }
  };

  const handleDeleteSubscription = async (subscription: Subscription) => {
    if (!window.confirm(t("sub.deleteConfirm"))) return;
    setDeletingSubscriptionId(subscription._id);
    try {
      await academicApi.deleteSubscription(subscription._id);
      success(t("sub.deleted"));
      await loadData();
    } catch (err: any) {
      error(err.message || "Failed to delete subscription");
    } finally {
      setDeletingSubscriptionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("nav.subscriptions")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Student course registrations, installment plans, and group
            transfers.
          </p>
        </div>

        <button
          onClick={() => setIsSubscribeOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t("sub.new")}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading enrollment records...
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            title="No enrollments recorded"
            description="Enroll students into course groups with scheduled installments."
            icon={FileCheck}
            actionText="New Enrollment"
            onAction={() => setIsSubscribeOpen(true)}
          />
        ) : (
          <DataTable
            rows={subscriptions}
            rowKey={(subscription) => subscription._id}
            columns={[
              {
                key: "student",
                header: "Student",
                render: (subscription) => {
                  const student = students.find(
                    (item) => item._id === subscription.studentId,
                  );
                  return (
                    <>
                      <div className="font-bold text-slate-900">
                        {student?.name || "Unknown"}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600">
                        {student?.studentCode}
                      </div>
                    </>
                  );
                },
              },
              {
                key: "courseGroup",
                header: "Course & Group",
                render: (subscription) => {
                  const course = courses.find(
                    (item) => item._id === subscription.courseId,
                  );
                  const group = groups.find(
                    (item) => item._id === subscription.groupId,
                  );
                  return (
                    <>
                      <div className="font-bold text-slate-800">
                        {course?.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {group?.name}
                      </div>
                      <div className="text-[11px] text-indigo-600 font-semibold mt-1">
                        {t("sub.remainingLessons")}: {subscription.lessonsRemaining ?? "—"}
                      </div>
                    </>
                  );
                },
              },
              {
                key: "fee",
                header: "Fee (QAR)",
                className: "font-bold text-slate-900",
                render: (subscription) => formatQAR(subscription.price),
              },
              {
                key: "paidBalance",
                header: "Paid / Balance",
                render: (subscription) => {
                  const remaining =
                    subscription.price - subscription.paidAmount;
                  return (
                    <>
                      <span className="text-emerald-600 font-semibold">
                        {formatQAR(subscription.paidAmount)}
                      </span>
                      {remaining > 0 && (
                        <div className="text-[11px] text-rose-500 font-semibold">
                          Due: {formatQAR(remaining)}
                        </div>
                      )}
                    </>
                  );
                },
              },
              {
                key: "installments",
                header: "Installments",
                render: (subscription) => (
                  <button
                    onClick={() => setViewPlanSub(subscription)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {subscription.installments?.length || 0} installments
                    </span>
                  </button>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (subscription) => (
                  <Badge
                    variant={
                      subscription.status === "active"
                        ? "success"
                        : subscription.status === "completed"
                          ? "info"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {subscription.status}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                headerClassName: "text-center",
                className: "text-center",
                render: (subscription) => (
                  <div className="flex items-center justify-center gap-1.5">
                    {hasRole("owner", "manager") && (
                      <button
                        onClick={() => openModifyPlan(subscription)}
                        title={t("sub.edit")}
                        aria-label={t("sub.edit")}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setTransferModalSub(subscription);
                        setTransferNewGroupId("");
                      }}
                      disabled={
                        !["active", "completed"].includes(subscription.status) ||
                        !subscription.lessonsRemaining ||
                        subscription.lessonsRemaining <= 0
                      }
                      title={t("sub.transfer")}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubscription(subscription)}
                      disabled={deletingSubscriptionId === subscription._id}
                      title={t("common.delete")}
                      aria-label={t("common.delete")}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* New Subscription Modal */}
      <Modal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        title={t("sub.new")}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubscribeSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("sub.selectStudent")} *
              </label>
              <SearchableSelect
                required
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              >
                <option value="">-- Choose Student --</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.studentCode} - {s.name}
                  </option>
                ))}
              </SearchableSelect>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("sub.selectCourse")} *
              </label>
              <SearchableSelect
                required
                value={selectedCourseId}
                onChange={setSelectedCourseId}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              >
                <option value="">-- Choose Course --</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.code} - {c.name} ({formatQAR(c.defaultPrice)})
                  </option>
                ))}
              </SearchableSelect>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("sub.selectGroup")} *
              </label>
              <SearchableSelect
                required
                value={selectedGroupId}
                onChange={setSelectedGroupId}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              >
                <option value="">-- Choose Group --</option>
                {groups
                  .filter(
                    (g) => !selectedCourseId || g.courseId === selectedCourseId,
                  )
                  .map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
              </SearchableSelect>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("sub.customPrice")} *
              </label>
              <input
                type="number"
                required
                step="any"
                min="0"
                placeholder="Total agreed fee"
                value={customPriceQar}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomPriceQar(value);
                  const balance = Math.max(
                    0,
                    qarToFils(value) - qarToFils(initialPaymentQar),
                  );
                  setInstallments((rows) => rescaleInstallments(rows, balance));
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("sub.initialPayment")}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={customPriceQar || undefined}
                value={initialPaymentQar}
                onChange={(e) => {
                  const value = e.target.value;
                  setInitialPaymentQar(value);
                  const balance = Math.max(
                    0,
                    qarToFils(customPriceQar) - qarToFils(value),
                  );
                  setInstallments((rows) => rescaleInstallments(rows, balance));
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {t("sub.initialPaymentHint")}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("payment.method")}
              </label>
              <SearchableSelect
                value={initialPaymentMethod}
                onChange={setInitialPaymentMethod}
                disabled={qarToFils(initialPaymentQar) <= 0}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold disabled:opacity-50"
              >
                <option value="cash">{t("payment.cash")}</option>
                <option value="card">{t("payment.card")}</option>
                <option value="transfer">{t("payment.transfer")}</option>
              </SearchableSelect>
            </div>
          </div>

          {qarToFils(initialPaymentQar) > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("treasury.account")} *
              </label>
              <SearchableSelect
                required
                value={initialPaymentCashboxId}
                onChange={setInitialPaymentCashboxId}
                disabled={!cashboxes.length}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold"
              >
                {!cashboxes.length && <option value="">{t("treasury.noAccounts")}</option>}
                {cashboxes.map((cashbox) => <option key={cashbox._id} value={cashbox._id}>{cashbox.name}</option>)}
              </SearchableSelect>
            </div>
          )}

          {qarToFils(initialPaymentQar) > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("sub.paymentNotes")}
              </label>
              <textarea
                rows={2}
                value={initialPaymentNotes}
                onChange={(e) => setInitialPaymentNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>
          )}

          {/* Quick Installment Presets */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="font-bold text-slate-700 block">
                  {t("sub.installments")}
                </label>
                <span className="text-[11px] text-slate-500">
                  {t("sub.remainingInstallments")}:{" "}
                  <strong className="text-indigo-700">
                    {formatQAR(remainingInstallmentBalance)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Presets:</span>
                <button
                  type="button"
                  onClick={() => generateInstallments(1)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md"
                >
                  1x (Full)
                </button>
                <button
                  type="button"
                  onClick={() => generateInstallments(2)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md"
                >
                  2x (Split)
                </button>
                <button
                  type="button"
                  onClick={() => generateInstallments(3)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md"
                >
                  3x (Monthly)
                </button>
              </div>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {installments.map((inst, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-6 font-bold text-slate-400 text-center">
                    #{index + 1}
                  </span>
                  <input
                    type="date"
                    required
                    value={inst.dueDate}
                    onChange={(e) => {
                      const updated = [...installments];
                      updated[index].dueDate = e.target.value;
                      setInstallments(updated);
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-hidden"
                  />
                  <div className="relative flex-1">
                    <input
                      type="number"
                      required
                      step="any"
                      min="0"
                      placeholder="Amount in QAR"
                      value={inst.amountQar}
                      onChange={(e) => {
                        const updated = [...installments];
                        updated[index].amountQar = e.target.value;
                        setInstallments(updated);
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-hidden"
                    />
                  </div>
                  {installments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInstallmentRow(index)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddInstallmentRow}
                className="mt-2 text-indigo-600 font-bold text-[11px] hover:underline"
              >
                + {t("sub.addInstallment")}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubscribeOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submitting ? "Enrolling..." : t("common.create")}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Installments / Modify Plan Modal */}
      <Modal
        isOpen={!!viewPlanSub}
        onClose={() => {
          setViewPlanSub(null);
          setIsModifyingPlan(false);
        }}
        title="Installment Schedule"
        maxWidth="lg"
      >
        {viewPlanSub && !isModifyingPlan && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400">Total Price: </span>
                <span className="font-bold text-slate-800">
                  {formatQAR(viewPlanSub.price)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Total Paid: </span>
                <span className="font-bold text-emerald-600">
                  {formatQAR(viewPlanSub.paidAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {viewPlanSub.installments?.map((inst, idx) => (
                <div
                  key={inst._id || idx}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Installment #{idx + 1}: {formatQAR(inst.amount)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Due: {formatDate(inst.dueDate)} • Paid:{" "}
                      {formatQAR(inst.paidAmount)}
                    </span>
                  </div>
                  <Badge
                    variant={
                      inst.status === "paid"
                        ? "success"
                        : inst.status === "partial"
                          ? "warning"
                          : inst.status === "overdue"
                            ? "danger"
                            : "neutral"
                    }
                    size="sm"
                  >
                    {inst.status}
                  </Badge>
                </div>
              ))}
            </div>

            {hasRole("owner", "manager") && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openModifyPlan(viewPlanSub)}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl font-bold transition cursor-pointer"
                >
                  {t("sub.modifyPlan")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewPlanSub(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  {t("common.close")}
                </button>
              </div>
            )}
          </div>
        )}

        {viewPlanSub && isModifyingPlan && (
          <form onSubmit={handleSaveModifiedPlan} className="space-y-4 text-xs">
            <p className="text-slate-500">
              Modify unpaid installment amounts and due dates. The sum of all
              rows must equal the unpaid total.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("common.reason")} *
              </label>
              <input
                type="text"
                required
                placeholder="Reason for installment rescheduling"
                value={modifyReason}
                onChange={(e) => setModifyReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div className="space-y-2">
              {unpaidRowsEdit.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="date"
                    required
                    value={row.dueDate}
                    onChange={(e) => {
                      const updated = [...unpaidRowsEdit];
                      updated[idx].dueDate = e.target.value;
                      setUnpaidRowsEdit(updated);
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                  />
                  <input
                    type="number"
                    required
                    step="any"
                    min="0"
                    placeholder="Amount in QAR"
                    value={row.amountQar}
                    onChange={(e) => {
                      const updated = [...unpaidRowsEdit];
                      updated[idx].amountQar = e.target.value;
                      setUnpaidRowsEdit(updated);
                    }}
                    className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModifyingPlan(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={modifyingPlanLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
              >
                {modifyingPlanLoading ? "Saving..." : "Apply Changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Transfer Group Modal */}
      <Modal
        isOpen={!!transferModalSub}
        onClose={() => setTransferModalSub(null)}
        title={t("sub.transfer")}
        maxWidth="md"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select New Group for Student *
            </label>
            <SearchableSelect
              required
              value={transferNewGroupId}
              onChange={setTransferNewGroupId}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            >
              <option value="">-- Choose New Group --</option>
              {groups
                .filter(
                  (g) =>
                    g.isActive &&
                    g.courseId === transferModalSub?.courseId &&
                    g._id !== transferModalSub?.groupId,
                )
                .map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
            </SearchableSelect>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900">
            {transferModalSub?.lessonsRemaining} {t("sub.transferPolicy")}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTransferModalSub(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={transferring}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {transferring ? "Transferring..." : "Confirm Transfer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
