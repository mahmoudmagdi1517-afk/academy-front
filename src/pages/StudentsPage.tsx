import React, { useEffect, useState } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Phone,
  CreditCard,
  Calendar,
  Eye,
  FileText,
  UserCheck,
} from "lucide-react";
import { Student, Subscription } from "../types/academic";
import { academicApi } from "../api/academic.api";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { DataTable } from "../components/common/DataTable";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/date";
import { formatQAR } from "../utils/currency";

export const StudentsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  // Create Student Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentCode: "",
    name: "",
    nameAr: "",
    phone: "",
    nationalId: "",
    email: "",
    dateOfBirth: "",
    notes: "",
  });

  // Details Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSubs, setStudentSubs] = useState<Subscription[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await academicApi.listStudents({
        active: onlyActive ? true : undefined,
        q: searchQuery || undefined,
      });
      setStudents(data);
    } catch (err: any) {
      error(err.message || "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, onlyActive]);

  const handleOpenDetails = async (student: Student) => {
    setSelectedStudent(student);
    setLoadingSubs(true);
    try {
      const subs = await academicApi.listSubscriptions({
        studentId: student._id,
      });
      setStudentSubs(subs);
    } catch {
      setStudentSubs([]);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      await academicApi.createStudent({
        studentCode: formData.studentCode.trim() || undefined,
        name: formData.name.trim(),
        nameAr: formData.nameAr.trim() || null,
        phone: formData.phone.trim() || null,
        nationalId: formData.nationalId.trim() || null,
        email: formData.email.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        notes: formData.notes.trim() || null,
      });

      success("Student created successfully");
      setIsCreateOpen(false);
      setFormData({
        studentCode: "",
        name: "",
        nameAr: "",
        phone: "",
        nationalId: "",
        email: "",
        dateOfBirth: "",
        notes: "",
      });
      fetchStudents();
    } catch (err: any) {
      error(err.message || "Failed to create student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("nav.students")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage student registrations, Qatar National IDs, and enrollment
            profiles.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t("student.new")}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, student code, phone, or QID..."
            className="w-full ps-10 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span>Active Only</span>
          </label>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading students directory...
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title="No students registered yet"
            description="Add your first academy student using the registration button."
            icon={GraduationCap}
            actionText="Register Student"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <DataTable
            rows={students}
            rowKey={(student) => student._id}
            columns={[
              {
                key: "code",
                header: "Code",
                className: "font-bold text-indigo-600 font-mono",
                render: (student) => student.studentCode,
              },
              {
                key: "name",
                header: "Student Name",
                render: (student) => (
                  <>
                    <div className="font-bold text-slate-900">
                      {student.name}
                    </div>
                    {student.nameAr && (
                      <div className="text-[11px] text-slate-400 font-sans">
                        {student.nameAr}
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: "contact",
                header: "Contact",
                render: (student) => (
                  <>
                    {student.phone ? (
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {student.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                    {student.email && (
                      <span className="block text-[11px] text-slate-400 truncate max-w-[140px]">
                        {student.email}
                      </span>
                    )}
                  </>
                ),
              },
              {
                key: "nationalId",
                header: "QID / National ID",
                className: "font-mono text-slate-600",
                render: (student) => student.nationalId || "-",
              },
              {
                key: "joined",
                header: "Joined",
                className: "text-slate-500",
                render: (student) => formatDate(student.createdAt),
              },
              {
                key: "status",
                header: "Status",
                render: (student) => (
                  <Badge
                    variant={student.isActive ? "success" : "neutral"}
                    size="sm"
                  >
                    {student.isActive ? "Active" : "Inactive"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                headerClassName: "text-center",
                className: "text-center",
                render: (student) => (
                  <button
                    onClick={() => handleOpenDetails(student)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="View profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* Create Student Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t("student.new")}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("student.code")}{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Auto-generated if empty"
                value={formData.studentCode}
                onChange={(e) =>
                  setFormData({ ...formData, studentCode: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("student.nationalId")}
              </label>
              <input
                type="text"
                placeholder="Qatar ID (11 digits)"
                value={formData.nationalId}
                onChange={(e) =>
                  setFormData({ ...formData, nationalId: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("student.name")} *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq Al-Mansoor"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("student.nameAr")}
              </label>
              <input
                type="text"
                dir="rtl"
                placeholder="الاسم بالعربية"
                value={formData.nameAr}
                onChange={(e) =>
                  setFormData({ ...formData, nameAr: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("student.phone")}
              </label>
              <input
                type="tel"
                placeholder="+974 5555 1234"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("student.email")}
              </label>
              <input
                type="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {t("student.dob")}
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {t("common.notes")}
              </label>
              <textarea
                rows={2}
                placeholder="Parent notes, medical alerts, etc."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submitting ? "Registering..." : t("common.create")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student Details & Subscriptions Modal */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent?.name || "Student Profile"}
        maxWidth="xl"
      >
        {selectedStudent && (
          <div className="space-y-6 text-xs">
            {/* Summary card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Student Code
                </span>
                <p className="font-mono font-bold text-indigo-600">
                  {selectedStudent.studentCode}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Phone
                </span>
                <p className="font-semibold text-slate-800">
                  {selectedStudent.phone || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold">
                  QID
                </span>
                <p className="font-mono font-semibold text-slate-800">
                  {selectedStudent.nationalId || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Status
                </span>
                <div>
                  <Badge
                    variant={selectedStudent.isActive ? "success" : "neutral"}
                    size="sm"
                  >
                    {selectedStudent.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Subscriptions history */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-3">
                Enrolled Courses & Plans
              </h4>
              {loadingSubs ? (
                <p className="text-slate-400">Loading enrollment records...</p>
              ) : studentSubs.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                  No active course subscriptions found for this student.
                </div>
              ) : (
                <div className="space-y-3">
                  {studentSubs.map((sub) => (
                    <div
                      key={sub._id}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900">
                          Total Fee: {formatQAR(sub.price)}
                        </span>
                        <Badge
                          variant={
                            sub.status === "active" ? "success" : "neutral"
                          }
                          size="sm"
                        >
                          {sub.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Paid: {formatQAR(sub.paidAmount)}</span>
                        <span>
                          Remaining: {formatQAR(sub.price - sub.paidAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
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
