import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  UserCheck,
  UserX,
  Clock3,
  HelpCircle,
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Search,
  Save,
  Check,
  RotateCcw,
  Users,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  XCircle,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { sessionApi } from '../api/session.api';
import { academicApi } from '../api/academic.api';
import { Session, AttendanceStatus, SessionDetail } from '../types/session';
import { Badge } from '../components/common/Badge';
import { formatDate, getQatarToday } from '../utils/date';

interface StudentAttendanceState {
  status: AttendanceStatus | null;
  note: string;
}

export const AttendancePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { t, language, isRtl } = useLanguage();
  const { success, error } = useToast();

  const isTeacher = user?.role === 'teacher';
  const canManageAttendance = hasRole('owner', 'manager');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [groupNameMap, setGroupNameMap] = useState<Record<string, { name: string; nameAr?: string | null }>>({});

  // Attendance Form State
  const [attendanceMap, setAttendanceMap] = useState<Record<string, StudentAttendanceState>>({});
  const [initialAttendanceMap, setInitialAttendanceMap] = useState<Record<string, StudentAttendanceState>>({});
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus | 'unmarked'>('all');

  // Load available sessions for today (for teacher or admin switcher)
  const loadSessionsList = useCallback(async () => {
    try {
      if (isTeacher) {
        const dashboard = await sessionApi.getTeacherDashboard(getQatarToday());
        setAvailableSessions(dashboard.sessions || []);
        const gMap: Record<string, { name: string; nameAr?: string | null }> = {};
        dashboard.groups?.forEach((g) => {
          gMap[g._id] = { name: g.name, nameAr: g.nameAr };
        });
        setGroupNameMap(gMap);
      } else {
        const [sessionsData, groupsData] = await Promise.all([
          sessionApi.listSessions({ currentDate: getQatarToday() }),
          academicApi.listGroups().catch(() => []),
        ]);
        setAvailableSessions(sessionsData || []);
        const gMap: Record<string, { name: string; nameAr?: string | null }> = {};
        groupsData?.forEach((g) => {
          gMap[g._id] = { name: g.name, nameAr: g.nameAr };
        });
        setGroupNameMap(gMap);
      }
    } catch {
      // Non-critical background fetch failure
    }
  }, [isTeacher]);

  // Load specific session detail
  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const detail = await sessionApi.getSession(id);
      setSessionDetail(detail);

      const map: Record<string, StudentAttendanceState> = {};
      // Initialize with students
      detail.students.forEach((student) => {
        map[student._id] = { status: null, note: '' };
      });
      // Merge existing attendance records
      detail.attendance?.forEach((rec) => {
        map[rec.studentId] = {
          status: rec.status,
          note: rec.note || '',
        };
      });

      setAttendanceMap(map);
      setInitialAttendanceMap(JSON.parse(JSON.stringify(map)));
    } catch (err: any) {
      error(err.message || 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void loadSessionsList();
  }, [loadSessionsList]);

  useEffect(() => {
    if (sessionId) {
      void loadSession(sessionId);
    } else if (availableSessions.length > 0) {
      // Default to the first session if none specified in URL
      navigate(`/attendance/${availableSessions[0]._id}`, { replace: true });
    } else {
      setLoading(false);
    }
  }, [sessionId, availableSessions, loadSession, navigate]);

  // Check 24-hr window expiration for teachers
  const session = sessionDetail?.session;
  const teacherAttendanceExpired =
    isTeacher &&
    session?.scheduledEndAt != null &&
    Date.now() > new Date(session.scheduledEndAt).getTime() + 24 * 60 * 60 * 1000;

  const isCancelled = session?.status === 'cancelled';
  const isReadOnly = isCancelled || teacherAttendanceExpired;

  // Unsaved changes check
  const hasUnsavedChanges = useMemo(() => {
    if (!sessionDetail) return false;
    return JSON.stringify(attendanceMap) !== JSON.stringify(initialAttendanceMap);
  }, [attendanceMap, initialAttendanceMap, sessionDetail]);

  // Student Attendance Handlers
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    if (isReadOnly) return;
    setAttendanceMap((prev) => {
      const currentStatus = prev[studentId]?.status;
      // If clicking already selected status, allow toggling back to null (unmarked)
      const newStatus = currentStatus === status ? null : status;
      return {
        ...prev,
        [studentId]: {
          status: newStatus,
          note: prev[studentId]?.note || '',
        },
      };
    });
  };

  const handleSetNote = (studentId: string, note: string) => {
    if (isReadOnly) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || null,
        note,
      },
    }));
  };

  const toggleNoteOpen = (studentId: string) => {
    setOpenNotes((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // Bulk Actions
  const handleMarkAllPresent = () => {
    if (isReadOnly || !sessionDetail) return;
    setAttendanceMap((prev) => {
      const next = { ...prev };
      sessionDetail.students.forEach((student) => {
        next[student._id] = {
          status: 'present',
          note: prev[student._id]?.note || '',
        };
      });
      return next;
    });
  };

  const handleClearAll = () => {
    if (isReadOnly || !sessionDetail) return;
    setAttendanceMap((prev) => {
      const next = { ...prev };
      sessionDetail.students.forEach((student) => {
        next[student._id] = {
          status: null,
          note: prev[student._id]?.note || '',
        };
      });
      return next;
    });
  };

  const handleDiscardChanges = () => {
    setAttendanceMap(JSON.parse(JSON.stringify(initialAttendanceMap)));
  };

  // Save Attendance to API
  const handleSaveAttendance = async () => {
    if (!session || isReadOnly) return;
    setSaving(true);
    try {
      const payload = (sessionDetail?.students || []).map((student) => ({
        studentId: student._id,
        status: attendanceMap[student._id]?.status || null,
        note: attendanceMap[student._id]?.note?.trim() || null,
      }));

      await sessionApi.saveAttendanceBatch(session._id, payload);
      setInitialAttendanceMap(JSON.parse(JSON.stringify(attendanceMap)));
      success(t('attendance.saveSuccess', t('session.attendanceSaved')));
    } catch (err: any) {
      error(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Close Session
  const handleCloseSession = async () => {
    if (!session || !canManageAttendance) return;
    setClosing(true);
    try {
      await sessionApi.closeSession(session._id);
      success('Session completed and closed successfully');
      void loadSession(session._id);
    } catch (err: any) {
      error(err.message || 'Failed to close session');
    } finally {
      setClosing(false);
    }
  };

  // Statistics Calculation
  const stats = useMemo(() => {
    const students = sessionDetail?.students || [];
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;

    students.forEach((s) => {
      const st = attendanceMap[s._id]?.status;
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else if (st === 'excused') excused++;
      else unmarked++;
    });

    const total = students.length;
    const recorded = total - unmarked;
    const completionPercent = total > 0 ? Math.round((recorded / total) * 100) : 0;

    return { total, present, absent, late, excused, unmarked, recorded, completionPercent };
  }, [sessionDetail, attendanceMap]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!sessionDetail) return [];
    return sessionDetail.students.filter((student) => {
      const name = student.name.toLowerCase();
      const nameAr = (student.nameAr || '').toLowerCase();
      const code = (student.studentCode || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || nameAr.includes(query) || code.includes(query);

      const studentStatus = attendanceMap[student._id]?.status;
      let matchesFilter = true;
      if (statusFilter === 'unmarked') {
        matchesFilter = !studentStatus;
      } else if (statusFilter !== 'all') {
        matchesFilter = studentStatus === statusFilter;
      }

      return matchesSearch && matchesFilter;
    });
  }, [sessionDetail, searchTerm, statusFilter, attendanceMap]);

  // Helper for current group name
  const currentGroupName = useMemo(() => {
    if (!session) return '';
    const g = groupNameMap[session.groupId];
    if (!g) return t('dashboard.teacherGroup');
    return language === 'ar' ? g.nameAr || g.name : g.name;
  }, [session, groupNameMap, language, t]);

  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  // Format session time range
  const formatTimeRange = () => {
    if (!session?.scheduledStartAt || !session?.scheduledEndAt) return null;
    try {
      const start = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Qatar',
      }).format(new Date(session.scheduledStartAt));
      const end = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Qatar',
      }).format(new Date(session.scheduledEndAt));
      return `${start} - ${end}`;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  if (!sessionId && availableSessions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to={isTeacher ? '/' : '/sessions'}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition"
          >
            <BackArrowIcon className="w-4 h-4" />
            <span>{isTeacher ? t('attendance.backToDashboard') : t('attendance.backToSessions')}</span>
          </Link>
        </div>
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">{t('attendance.noSessions')}</h3>
          <p className="text-xs text-slate-500 mb-6">{t('dashboard.teacherNoSessions')}</p>
          <Link
            to={isTeacher ? '/' : '/sessions'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
          >
            {isTeacher ? t('attendance.backToDashboard') : t('attendance.backToSessions')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header / Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={isTeacher ? '/' : '/sessions'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition shadow-xs"
          >
            <BackArrowIcon className="w-4 h-4" />
            <span>{isTeacher ? t('attendance.backToDashboard') : t('attendance.backToSessions')}</span>
          </Link>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-indigo-600" />
              <span>{t('attendance.pageTitle')}</span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
              {t('attendance.pageSubtitle')}
            </p>
          </div>
        </div>

        {/* Session Switcher if multiple sessions exist today */}
        {availableSessions.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-medium text-slate-500 hidden md:inline">
              {t('attendance.switchSession')}:
            </span>
            <div className="relative">
              <select
                value={session?._id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    navigate(`/attendance/${e.target.value}`);
                  }
                }}
                className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 pe-8 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs cursor-pointer"
              >
                {availableSessions.map((s) => {
                  const grp = groupNameMap[s.groupId];
                  const grpName = grp ? (language === 'ar' ? grp.nameAr || grp.name : grp.name) : 'Group';
                  return (
                    <option key={s._id} value={s._id}>
                      {grpName} — {formatDate(s.currentDate)}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Session Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/20 backdrop-blur-xs">
                <BookOpen className="w-3.5 h-3.5" />
                {currentGroupName}
              </span>
              {session && (
                <Badge
                  variant={
                    session.status === 'completed'
                      ? 'success'
                      : session.status === 'cancelled'
                      ? 'danger'
                      : 'warning'
                  }
                  size="sm"
                >
                  {t(`session.${session.status}`)}
                </Badge>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentGroupName}
            </h2>

            <div className="flex items-center gap-5 text-xs text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold">{formatDate(session?.currentDate)}</span>
              </span>

              {formatTimeRange() && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold font-mono">{formatTimeRange()}</span>
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">
                  {stats.total} {t('attendance.totalStudents')}
                </span>
              </span>
            </div>
          </div>

          {/* Quick Progress Dial / Bar */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[200px] shrink-0">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-300">{t('attendance.completionRate')}</span>
              <span className="text-white font-mono text-sm">{stats.completionPercent}%</span>
            </div>
            <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stats.completionPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-300 mt-2">
              <span>{stats.recorded} {t('attendance.recordedCount')}</span>
              <span>{stats.unmarked} {t('attendance.unmarked')}</span>
            </div>
          </div>
        </div>

        {/* Teacher Expired / Cancellation Warning Alert */}
        {isTeacher && teacherAttendanceExpired && (
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
            <span>{t('session.attendanceExpired')} {t('session.managerEditOnly')}</span>
          </div>
        )}

        {isCancelled && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-400/40 rounded-2xl text-rose-200 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-300" />
            <span>الجلسة ملغاة، لا يمكن تعديل بيانات الحضور.</span>
          </div>
        )}
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Students */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold opacity-75">{t('attendance.filterAll')}</span>
            <Users className="w-4 h-4 opacity-75" />
          </div>
          <div className="text-2xl font-black">{stats.total}</div>
        </div>

        {/* Present */}
        <div
          onClick={() => setStatusFilter('present')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'present'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white text-slate-800 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${statusFilter === 'present' ? 'text-white' : 'text-emerald-700'}`}>
              {t('session.present')}
            </span>
            <UserCheck className={`w-4 h-4 ${statusFilter === 'present' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className={`text-2xl font-black ${statusFilter === 'present' ? 'text-white' : 'text-emerald-700'}`}>
            {stats.present}
          </div>
        </div>

        {/* Absent */}
        <div
          onClick={() => setStatusFilter('absent')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'absent'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white text-slate-800 border-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${statusFilter === 'absent' ? 'text-white' : 'text-rose-700'}`}>
              {t('session.absent')}
            </span>
            <UserX className={`w-4 h-4 ${statusFilter === 'absent' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div className={`text-2xl font-black ${statusFilter === 'absent' ? 'text-white' : 'text-rose-700'}`}>
            {stats.absent}
          </div>
        </div>

        {/* Late */}
        <div
          onClick={() => setStatusFilter('late')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'late'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white text-slate-800 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${statusFilter === 'late' ? 'text-white' : 'text-amber-700'}`}>
              {t('session.late')}
            </span>
            <Clock3 className={`w-4 h-4 ${statusFilter === 'late' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className={`text-2xl font-black ${statusFilter === 'late' ? 'text-white' : 'text-amber-700'}`}>
            {stats.late}
          </div>
        </div>

        {/* Excused */}
        <div
          onClick={() => setStatusFilter('excused')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'excused'
              ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-500/20'
              : 'bg-white text-slate-800 border-sky-200 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${statusFilter === 'excused' ? 'text-white' : 'text-sky-700'}`}>
              {t('session.excused')}
            </span>
            <HelpCircle className={`w-4 h-4 ${statusFilter === 'excused' ? 'text-white' : 'text-sky-600'}`} />
          </div>
          <div className={`text-2xl font-black ${statusFilter === 'excused' ? 'text-white' : 'text-sky-700'}`}>
            {stats.excused}
          </div>
        </div>

        {/* Unmarked */}
        <div
          onClick={() => setStatusFilter('unmarked')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'unmarked'
              ? 'bg-slate-600 text-white border-slate-600 shadow-md ring-2 ring-slate-400/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${statusFilter === 'unmarked' ? 'text-white' : 'text-slate-500'}`}>
              {t('attendance.unmarked')}
            </span>
            <RotateCcw className={`w-4 h-4 ${statusFilter === 'unmarked' ? 'text-white' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black ${statusFilter === 'unmarked' ? 'text-white' : 'text-slate-600'}`}>
            {stats.unmarked}
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, and Bulk Actions */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('attendance.searchPlaceholder')}
            className="w-full ps-10 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{t('attendance.markAllPresent')}</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('attendance.clearAll')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Student Attendance Cards Grid */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {searchTerm || statusFilter !== 'all' ? 'لا توجد نتائج مطابقة للبحث' : t('attendance.noStudents')}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'جرب تغيير نص البحث أو الفلتر لعرض طلاب آخرين.'
              : 'المجموعة لا تحتوي على طلاب مقيدين حالياً.'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student, index) => {
            const currentAttendance = attendanceMap[student._id];
            const currentStatus = currentAttendance?.status || null;
            const currentNote = currentAttendance?.note || '';
            const isNoteOpen = openNotes[student._id] || Boolean(currentNote);

            // Styling helpers for student card header
            const statusColorClasses = {
              present: 'bg-emerald-500 text-white',
              absent: 'bg-rose-500 text-white',
              late: 'bg-amber-500 text-white',
              excused: 'bg-sky-500 text-white',
              unmarked: 'bg-slate-200 text-slate-600',
            }[currentStatus || 'unmarked'];

            const borderStatusClass = {
              present: 'border-emerald-200 hover:border-emerald-300 ring-1 ring-emerald-500/10',
              absent: 'border-rose-200 hover:border-rose-300 ring-1 ring-rose-500/10',
              late: 'border-amber-200 hover:border-amber-300 ring-1 ring-amber-500/10',
              excused: 'border-sky-200 hover:border-sky-300 ring-1 ring-sky-500/10',
              unmarked: 'border-slate-200/90 hover:border-slate-300',
            }[currentStatus || 'unmarked'];

            const studentDisplayName =
              language === 'ar' ? student.nameAr || student.name : student.name;

            return (
              <div
                key={student._id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-xs flex flex-col justify-between gap-4 ${borderStatusClass}`}
              >
                {/* Student Info Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar Initials */}
                    <div
                      className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-xs transition-colors ${statusColorClasses}`}
                    >
                      {studentDisplayName.trim().charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {studentDisplayName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {student.studentCode || `#${index + 1}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Badge */}
                  {currentStatus ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full shrink-0 ${
                        currentStatus === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentStatus === 'absent'
                          ? 'bg-rose-100 text-rose-800'
                          : currentStatus === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {currentStatus === 'present' && <UserCheck className="w-3 h-3" />}
                      {currentStatus === 'absent' && <UserX className="w-3 h-3" />}
                      {currentStatus === 'late' && <Clock3 className="w-3 h-3" />}
                      {currentStatus === 'excused' && <HelpCircle className="w-3 h-3" />}
                      <span>{t(`session.${currentStatus}`)}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                      {t('attendance.unmarked')}
                    </span>
                  )}
                </div>

                {/* 4 Interactive Attendance Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Present Button */}
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleSetStatus(student._id, 'present')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500 active:scale-95'
                        : 'bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-200/60 active:scale-95'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>{t('session.present')}</span>
                  </button>

                  {/* Absent Button */}
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleSetStatus(student._id, 'absent')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500 active:scale-95'
                        : 'bg-rose-50/70 hover:bg-rose-100/90 text-rose-800 border border-rose-200/60 active:scale-95'
                    }`}
                  >
                    <UserX className="w-4 h-4 shrink-0" />
                    <span>{t('session.absent')}</span>
                  </button>

                  {/* Late Button */}
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleSetStatus(student._id, 'late')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                      currentStatus === 'late'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-500 active:scale-95'
                        : 'bg-amber-50/70 hover:bg-amber-100/90 text-amber-800 border border-amber-200/60 active:scale-95'
                    }`}
                  >
                    <Clock3 className="w-4 h-4 shrink-0" />
                    <span>{t('session.late')}</span>
                  </button>

                  {/* Excused Button */}
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleSetStatus(student._id, 'excused')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                      currentStatus === 'excused'
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-2 ring-sky-500 active:scale-95'
                        : 'bg-sky-50/70 hover:bg-sky-100/90 text-sky-800 border border-sky-200/60 active:scale-95'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    <span>{t('session.excused')}</span>
                  </button>
                </div>

                {/* Individual Note Section */}
                <div className="pt-2 border-t border-slate-100">
                  {isNoteOpen ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-indigo-500" />
                          <span>{t('attendance.studentNote')}</span>
                        </span>
                        {!currentNote && (
                          <button
                            type="button"
                            onClick={() => toggleNoteOpen(student._id)}
                            className="text-slate-400 hover:text-slate-600 text-[10px]"
                          >
                            ✕ {t('common.cancel')}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={currentNote}
                        onChange={(e) => handleSetNote(student._id, e.target.value)}
                        placeholder={t('attendance.notePlaceholder')}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-slate-100"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => toggleNoteOpen(student._id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 transition"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{t('attendance.addNote')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Save / Action Bar */}
      <div className="fixed bottom-0 start-0 end-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-xl px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status summary info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {stats.recorded} / {stats.total} {t('attendance.recordedCount')}
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                ({stats.completionPercent}% مكتمل)
              </span>
            </div>

            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t('attendance.unsavedChanges')}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ms-auto">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                {t('attendance.discardChanges')}
              </button>
            )}

            {canManageAttendance && session?.status !== 'completed' && (
              <button
                type="button"
                onClick={handleCloseSession}
                disabled={closing || saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{closing ? 'جاري الإغلاق...' : t('session.closeSession')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving || isReadOnly || (!hasUnsavedChanges && stats.recorded === 0)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('session.savingAttendance')}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('session.saveAttendance')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
