import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sessionApi } from '../api/session.api';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { TeacherReport } from '../types/session';
import { formatDate, getQatarToday } from '../utils/date';
import { addDays, formatTime, getWeekStart, hasMissingAttendance } from '../utils/teacher';

type ScheduleSession = TeacherReport['sessions'][number];

export const TeacherSchedulePage: React.FC = () => {
  const { t, language } = useLanguage();
  const { error } = useToast();
  const [selectedDate, setSelectedDate] = useState(getQatarToday);
  const [view, setView] = useState<'week' | 'day'>('week');
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = getWeekStart(selectedDate);
  const fromDate = view === 'day' ? selectedDate : weekStart;
  const toDate = view === 'day' ? selectedDate : addDays(weekStart, 6);

  useEffect(() => {
    let active = true;
    setLoading(true);
    sessionApi.getTeacherReport({ fromDate, toDate })
      .then((report) => {
        if (active) setSessions(report.sessions);
      })
      .catch((err: Error) => {
        if (active) error(err.message || t('common.error'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [error, fromDate, t, toDate]);

  const visibleSessions = useMemo(
    () => sessions.slice().sort((a, b) =>
      (a.scheduledStartAt || '').localeCompare(b.scheduledStartAt || '')
    ),
    [sessions],
  );

  const movePeriod = (direction: number) => {
    setSelectedDate((date) => addDays(date, direction * (view === 'day' ? 1 : 7)));
  };

  const getTiming = (session: ScheduleSession) => {
    if (session.status === 'cancelled') return t('session.cancelled');
    const now = Date.now();
    const start = session.scheduledStartAt ? new Date(session.scheduledStartAt).getTime() : null;
    const end = session.scheduledEndAt ? new Date(session.scheduledEndAt).getTime() : null;
    if (session.status === 'completed' || session.currentDate < getQatarToday() || (end !== null && now > end)) {
      return t('teacher.ended');
    }
    if (session.currentDate === getQatarToday() && start !== null && end !== null && now >= start && now <= end) {
      return t('teacher.current');
    }
    return t('teacher.upcoming');
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('nav.mySchedule')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('teacher.scheduleSubtitle')}</p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => movePeriod(-1)} aria-label={t('teacher.previousPeriod')} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setSelectedDate(getQatarToday())} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">
            {t('teacher.today')}
          </button>
          <button onClick={() => movePeriod(1)} aria-label={t('teacher.nextPeriod')} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ms-2 text-sm font-semibold text-slate-700">
            {formatDate(fromDate)}{fromDate !== toDate ? ` – ${formatDate(toDate)}` : ''}
          </span>
        </div>
        <div className="flex gap-2">
          {(['week', 'day'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${view === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t(value === 'week' ? 'teacher.weekView' : 'teacher.dayView')}
            </button>
          ))}
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            aria-label={t('teacher.chooseDate')}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
        </div>
      </section>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">{t('common.loading')}</div>
      ) : visibleSessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          {t('teacher.noScheduleSessions')}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSessions.map((session) => {
            const missing = hasMissingAttendance(session);
            const timing = getTiming(session);
            const groupName = language === 'ar' ? session.groupNameAr || session.groupName : session.groupName;
            const courseName = language === 'ar' ? session.course?.nameAr || session.course?.name : session.course?.name;
            return (
              <article key={session._id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">{groupName}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{timing}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${missing ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {missing ? t('teacher.attendanceMissing') : t('teacher.attendanceRecorded')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{courseName || t('teacher.courseUnavailable')}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>{formatDate(session.currentDate)}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatTime(session.scheduledStartAt, language)}–{formatTime(session.scheduledEndAt, language)}</span>
                    <span>{session.students.length} {t('teacher.students')}</span>
                  </p>
                </div>
                {session.status !== 'cancelled' && (
                  <Link to={`/attendance/${encodeURIComponent(session._id)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">
                    <UserCheck className="h-4 w-4" />
                    {t('teacher.recordAttendance')}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
