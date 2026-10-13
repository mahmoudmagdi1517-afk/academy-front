import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  AlertCircle,
  UserCheck,
  UserX,
  Clock3,
  HelpCircle,
} from "lucide-react";
import { Session, AttendanceRecord, AttendanceStatus } from "../types/session";
import { Group, Student, Subscription } from "../types/academic";
import { Employee } from "../types/hr";
import { sessionApi } from "../api/session.api";
import { academicApi } from "../api/academic.api";
import { hrApi } from "../api/hr.api";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { DataTable } from "../components/common/DataTable";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { formatDate, getQatarToday } from "../utils/date";

const formatQatarTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Qatar",
      }).format(new Date(value))
    : "—";

export const SessionsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const { hasRole } = useAuth();
  const isTeacher = hasRole('teacher');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<Array<Pick<Group, '_id' | 'name' | 'nameAr'>>>([]);
  const [teachers, setTeachers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create Session Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submittingSession, setSubmittingSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    groupId: "",
    originalDate: getQatarToday(),
    startTime: "17:00",
    endTime: "18:00",
    teacherEmployeeId: "",
    notes: "",
  });

  // Postpone Modal
  const [postponeTarget, setPostponeTarget] = useState<Session | null>(null);
  const [postponeDate, setPostponeDate] = useState(getQatarToday());
  const [postponeReason, setPostponeReason] = useState("");
  const [submittingPostpone, setSubmittingPostpone] = useState(false);

  // Cancel Modal
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Attendance Modal
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(
    null,
  );
  const [sessionStudents, setSessionStudents] = useState<
    Array<Pick<Student, '_id' | 'studentCode' | 'name' | 'nameAr'>>
  >([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; note: string }>
  >({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const sessionsPromise = sessionApi.listSessions({
        currentDate: dateFilter || undefined,
        fromDate: dateFilter ? undefined : getQatarToday(),
        groupId: groupFilter || undefined,
        status: statusFilter || undefined,
      });
      if (isTeacher) {
        const [sessionsData, dashboard] = await Promise.all([
          sessionsPromise,
          sessionApi.getTeacherDashboard(getQatarToday()),
        ]);
        setSessions(sessionsData);
        setGroups(dashboard.groups);
        setTeachers([]);
      } else {
        const [sessionsData, groupsData, employeesData] = await Promise.all([
          sessionsPromise,
          academicApi.listGroups(),
          hrApi.listEmployees().catch(() => []),
        ]);
        setSessions(sessionsData);
        setGroups(groupsData);
        setTeachers(employeesData.filter((e) => e.isTeacher));
      }
    } catch (err: any) {
      error(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, groupFilter, statusFilter]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.groupId || !sessionForm.originalDate) return;

    setSubmittingSession(true);
    try {
      await sessionApi.createSession({
        groupId: sessionForm.groupId,
        originalDate: sessionForm.originalDate,
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime,
        teacherEmployeeId: sessionForm.teacherEmployeeId || null,
        notes: sessionForm.notes.trim() || null,
      });

      success("Session scheduled successfully");
      setIsCreateOpen(false);
      setSessionForm({
        groupId: "",
        originalDate: getQatarToday(),
        startTime: "17:00",
        endTime: "18:00",
        teacherEmployeeId: "",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to schedule session");
    } finally {
      setSubmittingSession(false);
    }
  };

  const handlePostponeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponeTarget || !postponeDate) return;

    setSubmittingPostpone(true);
    try {
      await sessionApi.postponeSession(postponeTarget._id, {
        toDate: postponeDate,
        reason: postponeReason.trim() || null,
      });

      success("Session postponed successfully");
      setPostponeTarget(null);
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to postpone session");
    } finally {
      setSubmittingPostpone(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;

    setSubmittingCancel(true);
    try {
      await sessionApi.cancelSession(
        cancelTarget._id,
        cancelReason.trim() || null,
      );
      success("Session cancelled");
      setCancelTarget(null);
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to cancel session");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const openAttendance = async (session: Session) => {
    setAttendanceSession(session);
    setLoadingAttendance(true);
    try {
      const detail = await sessionApi.getSession(session._id);
      setSessionStudents(detail.students);

      // Existing attendance
      const map: Record<string, { status: AttendanceStatus; note: string }> =
        {};
      detail.attendance?.forEach((rec) => {
        map[rec.studentId] = { status: rec.status, note: rec.note || "" };
      });
      setAttendanceMap(map);
    } catch (err: any) {
      error(err.message || "Failed to load session attendance data");
    } finally {
      setLoadingAttendance(false);
    }
  };

  const setStudentAttendanceStatus = async (
    studentId: string,
    status: AttendanceStatus,
    note: string = "",
  ) => {
    if (!attendanceSession) return;
    try {
      await sessionApi.upsertAttendance(attendanceSession._id, {
        studentId,
        status,
        note: note || undefined,
      });
      setAttendanceMap((prev) => ({
        ...prev,
        [studentId]: { status, note },
      }));
    } catch (err: any) {
      error(err.message || "Failed to record attendance");
    }
  };

  const handleCloseSession = async () => {
    if (!attendanceSession) return;
    try {
      await sessionApi.closeSession(attendanceSession._id);
      success("Session marked completed and closed");
      setAttendanceSession(null);
      loadData();
    } catch (err: any) {
      error(err.message || "Failed to close session");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t("nav.sessions")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Group schedules, student attendance tracking, and session
            completion.
          </p>
        </div>

        {hasRole("owner", "manager", "admin") && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t("session.new")}</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Group:</span>
          <SearchableSelect
            value={groupFilter}
            onChange={setGroupFilter}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden"
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </SearchableSelect>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Status:</span>
          <SearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="postponed">Postponed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </SearchableSelect>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No sessions found"
            description="Create sessions for student groups to track attendance."
            icon={CalendarDays}
            actionText="Schedule Session"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <DataTable
            rows={sessions}
            rowKey={(session) => session._id}
            columns={[
              {
                key: "group",
                header: "Group",
                className: "font-bold text-slate-900",
                render: (session) =>
                  groups.find((group) => group._id === session.groupId)?.name ||
                  "Group",
              },
              {
                key: "date",
                header: "Date",
                render: (session) => (
                  <>
                    <span className="font-semibold text-slate-800">
                      {formatDate(session.currentDate)}
                    </span>
                    {session.status === "postponed" && (
                      <div className="text-[11px] text-amber-600 line-through">
                        Orig: {formatDate(session.originalDate)}
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: "teacher",
                header: "Teacher",
                className: "text-slate-600",
                render: (session) =>
                  teachers.find(
                    (teacher) => teacher._id === session.teacherEmployeeId,
                  )?.name || "Unassigned",
              },
              {
                key: "time",
                header: "Time",
                render: (session) =>
                  session.scheduledStartAt && session.scheduledEndAt
                    ? `${formatQatarTime(session.scheduledStartAt)}–${formatQatarTime(session.scheduledEndAt)}`
                    : "—",
              },
              {
                key: "notes",
                header: "Notes",
                className: "max-w-[200px] truncate text-slate-500",
                render: (session) =>
                  session.notes ||
                  session.postponeReason ||
                  session.cancelReason ||
                  "-",
              },
              {
                key: "status",
                header: "Status",
                render: (session) => (
                  <Badge
                    variant={
                      session.status === "completed"
                        ? "success"
                        : session.status === "scheduled"
                          ? "primary"
                          : session.status === "postponed"
                            ? "warning"
                            : "danger"
                    }
                    size="sm"
                  >
                    {session.status}
                  </Badge>
                ),
              },
              {
                key: "attendance",
                header: "Attendance",
                headerClassName: "text-center",
                className: "text-center",
                render: (session) => (
                  <button
                    onClick={() => openAttendance(session)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{t("session.attendance")}</span>
                  </button>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                headerClassName: "text-center",
                className: "text-center",
                render: (session) =>
                  hasRole("owner", "manager") &&
                  session.status === "scheduled" && (
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setPostponeTarget(session);
                          setPostponeDate(session.currentDate);
                          setPostponeReason("");
                        }}
                        className="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded-lg font-semibold"
                      >
                        Postpone
                      </button>
                      <button
                        onClick={() => {
                          setCancelTarget(session);
                          setCancelReason("");
                        }}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  ),
              },
            ]}
          />
        )}
      </div>

      {/* Schedule Session Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t("session.new")}
        maxWidth="md"
      >
        <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Group *
            </label>
            <SearchableSelect
              required
              value={sessionForm.groupId}
              onChange={(value) =>
                setSessionForm({ ...sessionForm, groupId: value })
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
              {t("session.date")} *
            </label>
            <input
              type="date"
              required
              value={sessionForm.originalDate}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, originalDate: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("group.startTime")} *
              </label>
              <input
                type="time"
                required
                value={sessionForm.startTime}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, startTime: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("group.endTime")} *
              </label>
              <input
                type="time"
                required
                value={sessionForm.endTime}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, endTime: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Teacher / Instructor
            </label>
            <SearchableSelect
              value={sessionForm.teacherEmployeeId}
              onChange={(value) =>
                setSessionForm({
                  ...sessionForm,
                  teacherEmployeeId: value,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            >
              <option value="">-- Assigned Group Default --</option>
              {teachers.map((teach) => (
                <option key={teach._id} value={teach._id}>
                  {teach.name}
                </option>
              ))}
            </SearchableSelect>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t("common.notes")}
            </label>
            <input
              type="text"
              placeholder="Lesson topic, classroom number..."
              value={sessionForm.notes}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, notes: e.target.value })
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
              disabled={submittingSession}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submittingSession ? "Scheduling..." : t("common.create")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Postpone Session Modal */}
      <Modal
        isOpen={!!postponeTarget}
        onClose={() => setPostponeTarget(null)}
        title={t("session.postpone")}
        maxWidth="md"
      >
        <form onSubmit={handlePostponeSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              New Session Date *
            </label>
            <input
              type="date"
              required
              value={postponeDate}
              onChange={(e) => setPostponeDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t("common.reason")}
            </label>
            <input
              type="text"
              placeholder="Teacher illness, public holiday, etc."
              value={postponeReason}
              onChange={(e) => setPostponeReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPostponeTarget(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingPostpone}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-bold disabled:opacity-50"
            >
              {submittingPostpone ? "Saving..." : "Confirm Postpone"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Session Modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={t("session.cancelSession")}
        maxWidth="md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
            Are you sure you want to cancel this session?
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t("common.reason")}
            </label>
            <input
              type="text"
              placeholder="Reason for cancellation"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingCancel}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-bold disabled:opacity-50"
            >
              {submittingCancel ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        isOpen={!!attendanceSession}
        onClose={() => setAttendanceSession(null)}
        title={`${t("session.attendance")} - ${formatDate(attendanceSession?.currentDate)}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {loadingAttendance ? (
            <div className="py-12 text-center text-slate-400">
              Loading student attendance...
            </div>
          ) : sessionStudents.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              No students actively enrolled in this group.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {sessionStudents.map((student) => {
                const currentAtt = attendanceMap[student._id]?.status;

                return (
                  <div
                    key={student._id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {student.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {student.studentCode}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setStudentAttendanceStatus(student._id, "present")
                        }
                        className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition ${
                          currentAtt === "present"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{t("session.present")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStudentAttendanceStatus(student._id, "absent")
                        }
                        className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition ${
                          currentAtt === "absent"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>{t("session.absent")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStudentAttendanceStatus(student._id, "late")
                        }
                        className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition ${
                          currentAtt === "late"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        <Clock3 className="w-3.5 h-3.5" />
                        <span>{t("session.late")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStudentAttendanceStatus(student._id, "excused")
                        }
                        className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition ${
                          currentAtt === "excused"
                            ? "bg-sky-600 text-white shadow-xs"
                            : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{t("session.excused")}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            {attendanceSession?.status !== "completed" && (
              <button
                type="button"
                onClick={handleCloseSession}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs"
              >
                {t("session.closeSession")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setAttendanceSession(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold ms-auto"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
