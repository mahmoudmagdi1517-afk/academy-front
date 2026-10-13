import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  RotateCcw,
  Receipt,
  Search,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Payment } from "../types/payment";
import { Student, Subscription, Course } from "../types/academic";
import { paymentApi } from "../api/payment.api";
import { academicApi } from "../api/academic.api";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { DataTable } from "../components/common/DataTable";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { formatQAR, qarToFils, filsToQar } from "../utils/currency";
import { formatDateTime, formatDate, getQatarToday } from "../utils/date";
import { treasuryApi } from "../api/treasury.api";
import { Cashbox } from "../types/treasury";

export const PaymentsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [cashboxId, setCashboxId] = useState("");
  const [loading, setLoading] = useState(true);

  // Record Payment Modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState("");
  const [amountQar, setAmountQar] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [allocations, setAllocations] = useState<
    Array<{ installmentId: string; amountQar: string }>
  >([]);

  // Reverse Payment Modal
  const [reversePaymentTarget, setReversePaymentTarget] =
    useState<Payment | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, studentsData, subsData, coursesData, cashboxData] =
        await Promise.all([
          paymentApi.listPayments(),
          academicApi.listStudents(),
          academicApi.listSubscriptions(),
          academicApi.listCourses(),
          treasuryApi.listCashboxes(),
        ]);
      setPayments(paymentsData);
      setStudents(studentsData);
      setSubscriptions(subsData);
      setCourses(coursesData);
      setCashboxes(cashboxData);
      setCashboxId((current) => current || cashboxData[0]?._id || "");
    } catch (err: any) {
      error(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When a subscription is chosen for payment, auto-calculate allocations for unpaid installments
  useEffect(() => {
    if (selectedSubId) {
      const sub = subscriptions.find((s) => s._id === selectedSubId);
      if (sub) {
        const unpaidInst = sub.installments.filter((i) => i.status !== "paid");
        if (unpaidInst.length > 0) {
          const firstDue = unpaidInst[0];
          const rem = firstDue.amount - firstDue.paidAmount;
          setAmountQar(filsToQar(rem).toString());
          setAllocations([
            {
              installmentId: firstDue._id,
              amountQar: filsToQar(rem).toString(),
            },
          ]);
        }
      }
    }
  }, [selectedSubId, subscriptions]);

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId || !amountQar || !cashboxId) return;

    const amountFils = qarToFils(amountQar);
    if (amountFils <= 0) {
      error("Payment amount must be greater than zero");
      return;
    }

    const payloadAllocations = allocations
      .filter((a) => parseFloat(a.amountQar) > 0)
      .map((a) => ({
        installmentId: a.installmentId,
        amount: qarToFils(a.amountQar),
      }));

    const sumAlloc = payloadAllocations.reduce((s, a) => s + a.amount, 0);
    if (payloadAllocations.length > 0 && sumAlloc !== amountFils) {
      error(
        `Sum of allocations (${formatQAR(sumAlloc)}) must equal total payment (${formatQAR(amountFils)})`,
      );
      return;
    }

    setSubmittingPayment(true);
    try {
      await paymentApi.createPayment({
        subscriptionId: selectedSubId,
        cashboxId,
        amount: amountFils,
        allocations:
          payloadAllocations.length > 0 ? payloadAllocations : undefined,
        method: paymentMethod,
        notes: paymentNotes.trim() || null,
        paidAt: new Date().toISOString(),
      });

      success("Payment recorded successfully");
      setIsRecordOpen(false);
      setSelectedSubId("");
      setAmountQar("");
      setPaymentNotes("");
      setAllocations([]);
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to record payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversePaymentTarget) return;

    setReversing(true);
    try {
      await paymentApi.reversePayment(
        reversePaymentTarget._id,
        reverseReason.trim() || undefined,
      );
      success("Payment reversed successfully");
      setReversePaymentTarget(null);
      setReverseReason("");
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to reverse payment");
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("nav.payments")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Financial ledger, receipt generation, installment allocations, and
            reversals.
          </p>
        </div>

        <button
          onClick={() => setIsRecordOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t("payment.new")}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading payments ledger...
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Collect fees and issue official QAR receipts."
            icon={CreditCard}
            actionText="Record First Payment"
            onAction={() => setIsRecordOpen(true)}
          />
        ) : (
          <DataTable
            rows={payments}
            rowKey={(payment) => payment._id}
            rowClassName={(payment) =>
              payment.status === "reversed" ? "opacity-60 bg-slate-50/40" : ""
            }
            columns={[
              {
                key: "receipt",
                header: "Receipt #",
                className: "font-mono font-bold text-indigo-600",
                render: (payment) => payment.receiptNumber,
              },
              {
                key: "student",
                header: "Student",
                render: (payment) => {
                  const student = students.find(
                    (item) => item._id === payment.studentId,
                  );
                  return (
                    <>
                      <div className="font-bold text-slate-900">
                        {student?.name || "Unknown"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {student?.studentCode}
                      </div>
                    </>
                  );
                },
              },
              {
                key: "amount",
                header: "Amount (QAR)",
                className: "font-extrabold text-slate-900",
                render: (payment) => (
                  <span
                    className={
                      payment.status === "reversed"
                        ? "line-through text-slate-400"
                        : ""
                    }
                  >
                    {formatQAR(payment.amount)}
                  </span>
                ),
              },
              {
                key: "method",
                header: "Method",
                className: "uppercase text-[11px] font-bold text-slate-600",
                render: (payment) => payment.method,
              },
              {
                key: "paidAt",
                header: "Paid At",
                className: "text-slate-500",
                render: (payment) => formatDateTime(payment.paidAt),
              },
              {
                key: "status",
                header: "Status",
                render: (payment) => {
                  const isReversed = payment.status === "reversed";
                  return (
                    <Badge
                      variant={isReversed ? "danger" : "success"}
                      size="sm"
                    >
                      {isReversed
                        ? t("payment.reversed")
                        : t("payment.completed")}
                    </Badge>
                  );
                },
              },
              {
                key: "actions",
                header: "Actions",
                headerClassName: "text-center",
                className: "text-center",
                render: (payment) => (
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setSelectedReceipt(payment)}
                      title="View Receipt"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {payment.status !== "reversed" && (
                      <button
                        onClick={() => {
                          setReversePaymentTarget(payment);
                          setReverseReason("");
                        }}
                        title={t("payment.reverse")}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title={t("payment.new")}
        maxWidth="lg"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Active Enrollment *
            </label>
            <SearchableSelect
              required
              value={selectedSubId}
              onChange={setSelectedSubId}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            >
              <option value="">-- Choose Student & Course --</option>
              {subscriptions
                .filter(
                  (s) => s.status === "active" && s.price - s.paidAmount > 0,
                )
                .map((s) => {
                  const student = students.find((st) => st._id === s.studentId);
                  const course = courses.find((c) => c._id === s.courseId);
                  const rem = s.price - s.paidAmount;
                  return (
                    <option key={s._id} value={s._id}>
                      {student?.name} — {course?.name} (Remaining:{" "}
                      {formatQAR(rem)})
                    </option>
                  );
                })}
            </SearchableSelect>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("treasury.account")} *
              </label>
              <SearchableSelect
                required
                value={cashboxId}
                onChange={setCashboxId}
                disabled={!cashboxes.length}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold"
              >
                {!cashboxes.length && <option value="">{t("treasury.noAccounts")}</option>}
                {cashboxes.map((cashbox) => (
                  <option key={cashbox._id} value={cashbox._id}>{cashbox.name}</option>
                ))}
              </SearchableSelect>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Amount to Collect (QAR) *
              </label>
              <input
                type="number"
                required
                step="any"
                min="0.01"
                placeholder="e.g. 250.00"
                value={amountQar}
                onChange={(e) => setAmountQar(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("payment.method")} *
              </label>
              <SearchableSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold"
              >
                <option value="cash">{t("payment.cash")}</option>
                <option value="card">{t("payment.card")}</option>
                <option value="transfer">{t("payment.transfer")}</option>
              </SearchableSelect>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t("common.notes")}
            </label>
            <textarea
              rows={2}
              placeholder="Cheque number, transaction ID, reference..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRecordOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingPayment || !cashboxes.length}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submittingPayment ? "Processing..." : "Issue Receipt"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reverse Payment Modal */}
      <Modal
        isOpen={!!reversePaymentTarget}
        onClose={() => setReversePaymentTarget(null)}
        title={t("payment.reverse")}
        maxWidth="md"
      >
        <form onSubmit={handleReverseSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
            <p className="font-bold">
              Are you sure you want to reverse this payment?
            </p>
            <p className="text-[11px] mt-1">
              Receipt: {reversePaymentTarget?.receiptNumber} • Amount:{" "}
              {formatQAR(reversePaymentTarget?.amount)}
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t("common.reason")} for reversal
            </label>
            <input
              type="text"
              placeholder="e.g. Bank chargeback, erroneous entry"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReversePaymentTarget(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={reversing}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-bold disabled:opacity-50"
            >
              {reversing ? "Reversing..." : "Confirm Reversal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt View Modal */}
      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title="Payment Receipt"
        maxWidth="md"
      >
        {selectedReceipt && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">
                    Receipt Number
                  </span>
                  <p className="font-mono text-base font-extrabold text-indigo-600">
                    {selectedReceipt.receiptNumber}
                  </p>
                </div>
                <Badge
                  variant={
                    selectedReceipt.status === "completed"
                      ? "success"
                      : "danger"
                  }
                  size="md"
                >
                  {selectedReceipt.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Total Amount
                  </span>
                  <p className="font-extrabold text-base text-slate-900">
                    {formatQAR(selectedReceipt.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Payment Method
                  </span>
                  <p className="font-bold text-slate-800 uppercase">
                    {selectedReceipt.method}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Date Paid
                  </span>
                  <p className="font-semibold text-slate-800">
                    {formatDateTime(selectedReceipt.paidAt)}
                  </p>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Notes:
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    {selectedReceipt.notes}
                  </p>
                </div>
              )}

              {selectedReceipt.reversedAt && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px]">
                  <span className="font-bold">Reversed on: </span>
                  {formatDateTime(selectedReceipt.reversedAt)}
                  {selectedReceipt.reverseReason && (
                    <div>Reason: {selectedReceipt.reverseReason}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
