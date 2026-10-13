import React, { useEffect, useState } from "react";
import { History, Plus, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { MakeupSession } from "../types/session";
import { Student, Group } from "../types/academic";
import { sessionApi } from "../api/session.api";
import { academicApi } from "../api/academic.api";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { DataTable } from "../components/common/DataTable";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { formatDate, getQatarToday } from "../utils/date";

export const MakeupsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();

  const [makeups, setMakeups] = useState<MakeupSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Makeup Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    groupId: "",
    scheduledDate: getQatarToday(),
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [makeupsData, studentsData, groupsData] = await Promise.all([
        sessionApi.listMakeups(),
        academicApi.listStudents(),
        academicApi.listGroups(),
      ]);
      setMakeups(makeupsData);
      setStudents(studentsData);
      setGroups(groupsData);
    } catch (err: any) {
      error(err.message || "Failed to load makeup sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.groupId || !formData.scheduledDate)
      return;

    setSubmitting(true);
    try {
      await sessionApi.createMakeup({
        studentId: formData.studentId,
        groupId: formData.groupId,
        scheduledDate: formData.scheduledDate,
        notes: formData.notes.trim() || null,
      });

      success("Makeup session scheduled successfully");
      setIsCreateOpen(false);
      setFormData({
        studentId: "",
        groupId: "",
        scheduledDate: getQatarToday(),
        notes: "",
      });
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to schedule makeup");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkMissed = async (id: string) => {
    try {
      await sessionApi.markMakeupMissed(id);
      success("Makeup marked as missed");
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to update makeup status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("nav.makeups")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Compensation classes for missed or excused student sessions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Makeup</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading makeup classes...
          </div>
        ) : makeups.length === 0 ? (
          <EmptyState
            title="No makeup sessions scheduled"
            description="Students who missed class can be scheduled for makeup sessions."
            icon={History}
            actionText="Schedule Makeup"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <DataTable
            rows={makeups}
            rowKey={(makeup) => makeup._id}
            columns={[
              {
                key: "student",
                header: "Student",
                className: "font-bold text-slate-900",
                render: (makeup) =>
                  students.find((student) => student._id === makeup.studentId)
                    ?.name || "Unknown",
              },
              {
                key: "group",
                header: "Group",
                className: "text-slate-800",
                render: (makeup) =>
                  groups.find((group) => group._id === makeup.groupId)?.name ||
                  "Group",
              },
              {
                key: "scheduledDate",
                header: "Scheduled Date",
                className: "font-semibold text-slate-800",
                render: (makeup) => formatDate(makeup.scheduledDate),
              },
              {
                key: "pricing",
                header: "Pricing",
                className: "uppercase text-[11px] font-bold text-slate-500",
                render: (makeup) => makeup.pricingType,
              },
              {
                key: "notes",
                header: "Notes",
                className: "max-w-[200px] truncate text-slate-500",
                render: (makeup) => makeup.notes || "-",
              },
              {
                key: "status",
                header: "Status",
                render: (makeup) => (
                  <Badge
                    variant={makeup.isMissed ? "danger" : "success"}
                    size="sm"
                  >
                    {makeup.isMissed ? "Missed" : "Scheduled"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                headerClassName: "text-center",
                className: "text-center",
                render: (makeup) =>
                  !makeup.isMissed && (
                    <button
                      onClick={() => handleMarkMissed(makeup._id)}
                      className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-[11px] transition"
                    >
                      Mark Missed
                    </button>
                  ),
              },
            ]}
          />
        )}
      </div>

      {/* Schedule Makeup Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Makeup Session"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Student *
            </label>
            <SearchableSelect
              required
              value={formData.studentId}
              onChange={(value) =>
                setFormData({ ...formData, studentId: value })
              }
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
              Select Group *
            </label>
            <SearchableSelect
              required
              value={formData.groupId}
              onChange={(value) =>
                setFormData({ ...formData, groupId: value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            >
              <option value="">-- Choose Group --</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
            </SearchableSelect>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Scheduled Date *
            </label>
            <input
              type="date"
              required
              value={formData.scheduledDate}
              onChange={(e) =>
                setFormData({ ...formData, scheduledDate: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t("common.notes")}
            </label>
            <input
              type="text"
              placeholder="Reason, topics to cover..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submitting ? "Scheduling..." : t("common.create")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
