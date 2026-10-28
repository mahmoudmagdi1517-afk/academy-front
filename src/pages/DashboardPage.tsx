import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Users,
  CreditCard,
  ReceiptText,
  WalletCards,
  Calendar,
  AlertTriangle,
  Play,
  ArrowUpRight,
  Clock,
  Sparkles,
  CheckCircle,
  UserCheck,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { academicApi } from '../api/academic.api';
import { paymentApi } from '../api/payment.api';
import { expenseApi } from '../api/expense.api';
import { sessionApi } from '../api/session.api';
import { hrApi } from '../api/hr.api';
import { formatQAR } from '../utils/currency';
import { formatDateTime, getQatarToday } from '../utils/date';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../types/hr';
import { TeacherDashboard, TeacherReport } from '../types/session';
import { addDays, formatTime } from '../utils/teacher';

export const DashboardPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { hasRole } = useAuth();
  const isTeacher = hasRole('teacher');
  const isOwner = hasRole('owner');
  const canViewExpenses = hasRole('owner', 'manager');
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);
  const [stats, setStats] = useState({
    studentsCount: 0,
    coursesCount: 0,
    groupsCount: 0,
    paymentsTotal: 0,
    expensesTotal: 0,
    payrollTotal: 0,
    cashboxBalance: 0,
    netProfit: 0,
    todaySessionsCount: 0,
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [teacherDashboard, setTeacherDashboard] = useState<TeacherDashboard | null>(null);
  const [teacherUpcoming, setTeacherUpcoming] = useState<TeacherReport['sessions']>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = getQatarToday();

      if (isTeacher) {
        const [data, report] = await Promise.all([
          sessionApi.getTeacherDashboard(today),
          sessionApi.getTeacherReport({ fromDate: today, toDate: addDays(today, 7) }),
        ]);
        setTeacherDashboard(data);
        setTeacherUpcoming(report.sessions);
        setStats({
          studentsCount: new Set(data.groups.flatMap((group) => group.students.map((student) => student._id))).size,
          coursesCount: 0,
          groupsCount: data.groups.length,
          paymentsTotal: 0,
          expensesTotal: 0,
          payrollTotal: 0,
          cashboxBalance: 0,
          netProfit: 0,
          todaySessionsCount: data.sessions.length,
        });
        setNotifications([]);
        return;
      }

      // Fetch parallel data according to user access
      const promises: Promise<any>[] = [
        academicApi.listStudents({ active: true }).catch(() => []),
        academicApi.listCourses().catch(() => []),
        academicApi.listGroups().catch(() => []),
        canViewExpenses
          ? Promise.resolve([])
          : hasRole('admin')
          ? paymentApi.listPayments().catch(() => [])
          : Promise.resolve([]),
        sessionApi.listSessions({ currentDate: today }).catch(() => []),
        hasRole('owner', 'manager', 'admin') ? hrApi.listNotifications().catch(() => []) : Promise.resolve([]),
        canViewExpenses ? expenseApi.getFinancialSummary() : Promise.resolve(null),
      ];

      const [students, courses, groups, payments, sessions, notifs, financialSummary] = await Promise.all(promises);

      const totalPaymentsSum = financialSummary?.paymentsTotal ?? (Array.isArray(payments)
        ? payments.reduce((acc: number, p: any) => acc + (p.status === 'completed' ? p.amount : 0), 0)
        : 0);

      setStats({
        studentsCount: Array.isArray(students) ? students.length : 0,
        coursesCount: Array.isArray(courses) ? courses.length : 0,
        groupsCount: Array.isArray(groups) ? groups.length : 0,
        paymentsTotal: totalPaymentsSum,
        expensesTotal: financialSummary?.expensesTotal || 0,
        payrollTotal: financialSummary?.payrollTotal || 0,
        cashboxBalance: financialSummary?.cashboxBalance || 0,
        netProfit: financialSummary?.netProfit || 0,
        todaySessionsCount: Array.isArray(sessions) ? sessions.length : 0,
      });

      if (Array.isArray(notifs)) {
        setNotifications(notifs.slice(0, 10));
      }
    } catch (err: any) {
      error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (isTeacher || !hasRole('owner', 'manager', 'admin')) return;

    let hasShownError = false;
    const intervalId = window.setInterval(async () => {
      try {
        const rows = await hrApi.listNotifications();
        setNotifications(rows.slice(0, 10));
        hasShownError = false;
      } catch (err: any) {
        if (!hasShownError) {
          error(err.message || 'Failed to refresh notifications');
          hasShownError = true;
        }
      }
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleRunDailyJobs = async () => {
    setRunningCron(true);
    try {
      await hrApi.runDailyJobsNow();
      success(t('dashboard.cronSuccess'));
      fetchDashboardData();
    } catch (err: any) {
      error(err.message || 'Failed to run daily job audit');
    } finally {
      setRunningCron(false);
    }
  };

  const getNotificationTitle = (item: NotificationItem) =>
    item.type === 'SESSION_LOG_MISSING'
      ? t('notification.sessionMissingTitle')
      : item.title || item.type;

  const getNotificationMessage = (item: NotificationItem) => {
    if (item.type !== 'SESSION_LOG_MISSING') return item.message || '';
    const time = item.payload?.startTime
      ? new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Qatar',
        }).format(new Date(item.payload.startTime))
      : '';
    return t('notification.sessionMissingMessage')
      .replace(
        '{teacher}',
        (language === 'ar' ? item.payload?.teacherNameAr : item.payload?.teacherName) ||
          t('notification.unassignedTeacher')
      )
      .replace('{date}', item.payload?.currentDate || '')
      .replace('{time}', time)
      .replace(
        '{group}',
        (language === 'ar' ? item.payload?.groupNameAr : item.payload?.groupName) || ''
      );
  };

  if (isTeacher) {
    const dashboard = teacherDashboard;
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex items-center gap-2 mb-2 text-indigo-300">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">{t('dashboard.teacherTitle')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t('dashboard.welcome')}</h2>
          <p className="text-slate-300 text-sm mt-1">{t('dashboard.teacherSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard title={t('dashboard.groupsCount')} value={loading ? '...' : stats.groupsCount} icon={BookOpen} color="indigo" subtitle={t('dashboard.teacherGroups')} />
          <StatCard title={t('dashboard.teacherStudents')} value={loading ? '...' : stats.studentsCount} icon={GraduationCap} color="sky" subtitle={t('dashboard.teacherEnrolled')} />
          <StatCard title={t('dashboard.todaySessions')} value={loading ? '...' : stats.todaySessionsCount} icon={Calendar} color="amber" subtitle={t('dashboard.teacherAttendance')} />
          <StatCard
            title={t('teacher.missingAttendanceSessions')}
            value={loading ? '...' : dashboard?.sessions.filter((session) => {
              const group = dashboard.groups.find((item) => item._id === session.groupId);
              return group?.students.some((student) =>
                !session.attendance.some((record) => record.studentId === student._id)
              ) || false;
            }).length || 0}
            icon={AlertTriangle}
            color="rose"
            subtitle={t('teacher.today')}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/my-groups" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">
            <BookOpen className="h-4 w-4" /> {t('teacher.openGroups')}
          </Link>
          <Link to="/my-schedule" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">
            <Calendar className="h-4 w-4" /> {t('teacher.openSchedule')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 mb-4">{t('dashboard.teacherGroups')}</h3>
            {!dashboard?.groups.length ? (
              <p className="py-8 text-center text-sm text-slate-400">{loading ? t('common.loading') : t('dashboard.teacherNoGroups')}</p>
            ) : (
              <div className="space-y-4">
                {dashboard.groups.map((group) => (
                  <div key={group._id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-bold text-slate-800">{language === 'ar' ? group.nameAr || group.name : group.name}</h4>
                      <Badge variant="info" size="sm">{group.students.length} {t('dashboard.teacherStudents')}</Badge>
                    </div>
                    {group.students.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.students.map((student) => (
                          <span key={student._id} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                            {language === 'ar' ? student.nameAr || student.name : student.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">{t('dashboard.teacherToday')}</h3>
              <Link to="/my-schedule" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">{t('teacher.openSchedule')}</Link>
            </div>
            {!dashboard?.sessions.length ? (
              <p className="py-8 text-center text-sm text-slate-400">{loading ? t('common.loading') : t('dashboard.teacherNoSessions')}</p>
            ) : (
              <div className="space-y-3">
                {dashboard.sessions.map((session) => {
                  const group = dashboard.groups.find((item) => item._id === session.groupId);
                  const counts = session.attendance.reduce<Record<string, number>>((result, row) => {
                    result[row.status] = (result[row.status] || 0) + 1;
                    return result;
                  }, {});
                  return (
                    <div key={session._id} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex justify-between gap-3">
                        <span className="font-bold text-slate-800">{group ? language === 'ar' ? group.nameAr || group.name : group.name : t('dashboard.teacherGroup')}</span>
                        <Badge variant={session.status === 'completed' ? 'success' : 'warning'} size="sm">{t(`session.${session.status}`)}</Badge>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {t('dashboard.teacherAttendanceSummary')}: {t('session.present')} {counts.present || 0} · {t('session.absent')} {counts.absent || 0} · {t('session.late')} {counts.late || 0}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatTime(session.scheduledStartAt, language)}–{formatTime(session.scheduledEndAt, language)}
                      </p>
                      {group?.students.some((student) =>
                        !session.attendance.some((record) => record.studentId === student._id)
                      ) && (
                        <p className="mt-2 text-[11px] font-bold text-amber-700">{t('teacher.attendanceMissing')}</p>
                      )}
                      {session.status !== 'cancelled' && (
                        <Link
                          to={`/attendance/${encodeURIComponent(session._id)}`}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                        >
                          <UserCheck className="h-4 w-4" />
                          {t('session.attendance')}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-800">{t('teacher.upcomingSchedule')}</h3>
            <Link to="/my-schedule" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">{t('teacher.viewSchedule')}</Link>
          </div>
          {teacherUpcoming.filter((session) => session.currentDate > getQatarToday()).length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">{t('teacher.noUpcomingSessions')}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teacherUpcoming.filter((session) => session.currentDate > getQatarToday()).slice(0, 6).map((session) => (
                <Link
                  key={session._id}
                  to={`/attendance/${encodeURIComponent(session._id)}`}
                  className="rounded-2xl border border-slate-100 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <p className="font-bold text-slate-800">{language === 'ar' ? session.groupNameAr || session.groupName : session.groupName}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(session.scheduledStartAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-indigo-500/30 rounded-lg text-indigo-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs uppercase tracking-widest font-bold text-indigo-300">
                Academy Live Control
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('dashboard.welcome')}
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Operating in Doha (Asia/Qatar) • Accounting currency in QAR (Qatari Riyal).
            </p>
          </div>

          {hasRole('owner', 'manager') && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRunDailyJobs}
                disabled={runningCron}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${runningCron ? 'animate-spin' : ''}`} />
                <span>{runningCron ? 'Auditing...' : t('dashboard.runCron')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title={t('dashboard.studentsCount')}
          value={loading ? '...' : stats.studentsCount}
          icon={GraduationCap}
          color="indigo"
          subtitle="Enrolled Active Learners"
        />
        <StatCard
          title={t('dashboard.coursesCount')}
          value={loading ? '...' : stats.coursesCount}
          icon={BookOpen}
          color="sky"
          subtitle={`${stats.groupsCount} Active Groups`}
        />
        <StatCard
          title={t('dashboard.totalPayments')}
          value={loading ? '...' : formatQAR(stats.paymentsTotal)}
          icon={CreditCard}
          color="emerald"
          subtitle="Total Collected Revenue"
        />
        {canViewExpenses && (
          <StatCard
            title={t('dashboard.totalExpenses')}
            value={loading ? '...' : formatQAR(stats.expensesTotal)}
            icon={ReceiptText}
            color="rose"
            subtitle={t('dashboard.operatingExpenses')}
          />
        )}
        {canViewExpenses && (
          <StatCard
            title={t('dashboard.cashboxBalance')}
            value={loading ? '...' : formatQAR(stats.cashboxBalance)}
            icon={WalletCards}
            color="sky"
            subtitle={t('dashboard.manageCashboxes')}
          />
        )}
        {canViewExpenses && (
          <StatCard
            title={isOwner ? t('dashboard.netProfit') : t('dashboard.approvedPayroll')}
            value={loading ? '...' : formatQAR(isOwner ? stats.netProfit : stats.payrollTotal)}
            icon={WalletCards}
            color={isOwner ? 'emerald' : 'amber'}
            subtitle={isOwner ? t('dashboard.netProfitFormula') : t('dashboard.payrollDeducted')}
          />
        )}
        <StatCard
          title={t('dashboard.todaySessions')}
          value={loading ? '...' : stats.todaySessionsCount}
          icon={Calendar}
          color="amber"
          subtitle="Scheduled For Today"
        />
      </div>

      {/* Two Column Layout: Operational Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts & Notifications */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {t('dashboard.notifications')}
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {notifications.length} alerts
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">All systems clear!</p>
              <p className="text-xs text-slate-400">No overdue installments or attendance warnings.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 space-y-3">
              {notifications.map((item) => (
                <div key={item._id} className="pt-3 first:pt-0 flex items-start gap-4">
                  <span
                    className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                      item.type.includes('OVERDUE')
                        ? 'bg-rose-500'
                        : item.type.includes('DUE')
                        ? 'bg-amber-500'
                        : 'bg-sky-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800 truncate">{getNotificationTitle(item)}</p>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{getNotificationMessage(item)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Launchpad */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-4">Operations Hub</h3>
            <p className="text-xs text-slate-500 mb-6">
              Instant shortcuts to common academic, registration, and attendance tasks.
            </p>

            <div className="space-y-3">
              <Link
                to="/students"
                className="group flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200/60 hover:border-indigo-200 rounded-2xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-xs group-hover:scale-105 transition">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-900 block">
                      Register Student
                    </span>
                    <span className="text-[11px] text-slate-400">Enroll or search records</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 rtl:rotate-270 transition" />
              </Link>

              <Link
                to="/payments"
                className="group flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200/60 hover:border-emerald-200 rounded-2xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white text-emerald-600 rounded-xl shadow-xs group-hover:scale-105 transition">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-900 block">
                      Receive Payment
                    </span>
                    <span className="text-[11px] text-slate-400">Issue QAR receipt</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 rtl:rotate-270 transition" />
              </Link>

              {canViewExpenses && (
                <Link
                  to="/expenses"
                  className="group flex items-center justify-between p-3.5 bg-slate-50 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-200 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-rose-600 rounded-xl shadow-xs group-hover:scale-105 transition">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 group-hover:text-rose-900 block">{t('expense.new')}</span>
                      <span className="text-[11px] text-slate-400">{t('dashboard.totalExpenses')}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 rtl:rotate-270 transition" />
                </Link>
              )}

              <Link
                to="/sessions"
                className="group flex items-center justify-between p-3.5 bg-slate-50 hover:bg-amber-50 border border-slate-200/60 hover:border-amber-200 rounded-2xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white text-amber-600 rounded-xl shadow-xs group-hover:scale-105 transition">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-amber-900 block">
                      Take Attendance
                    </span>
                    <span className="text-[11px] text-slate-400">Mark daily attendance</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 rtl:rotate-270 transition" />
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Server status: Normal</span>
            <span className="text-emerald-600 font-bold">UTC+3 (Qatar)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
