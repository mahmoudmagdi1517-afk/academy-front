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
  const [groups, setGroups] = useState<TeacherReport['groups']>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'missing' | 'recorded'>('all');
  const [loading, setLoading] = useState(true);

  const weekStart = getWeekStart(selectedDate);
  const fromDate = view === 'day' ? selectedDate : weekStart;
  const toDate = view === 'day' ? selectedDate : addDays(weekStart, 6);

  useEffect(() => {
    let active = true;
    setLoading(true);
    sessionApi.getTeacherReport({ fromDate, toDate })
      .then((report) => {
        if (active) {
          setSessions(report.sessions);
          setGroups(report.groups);
        }
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
    () => sessions
      .filter((session) => !selectedGroup || session.groupId === selectedGroup)
      .filter((session) => attendanceFilter === 'all' ||
        (attendanceFilter === 'missing'
          ? hasMissingAttendance(session)
          : session.status !== 'cancelled' && !hasMissingAttendance(session)))
      .slice()
      .sort((a, b) => (a.scheduledStartAt || '').localeCompare(b.scheduledStartAt || '')),
    [attendanceFilter, selectedGroup, sessions],
  );
  const calendarDays = Array.from(
    { length: view === 'week' ? 7 : 1 },
    (_, index) => addDays(view === 'week' ? weekStart : selectedDate, index),
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
        <p className="mt-1 text-sm text-slate-500">{t('teacher.calendarSubtitle')}</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex flex-wrap gap-2">
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
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            {t('teacher.filterGroup')}
            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="">{t('teacher.allGroups')}</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>{language === 'ar' ? group.nameAr || group.name : group.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            {t('teacher.attendanceStatus')}
            <select value={attendanceFilter} onChange={(event) => setAttendanceFilter(event.target.value as typeof attendanceFilter)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="all">{t('teacher.allAttendanceStatuses')}</option>
              <option value="missing">{t('teacher.attendanceMissing')}</option>
              <option value="recorded">{t('teacher.attendanceRecorded')}</option>
            </select>
          </label>
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
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className={`grid min-w-[980px] ${view === 'week' ? 'grid-cols-7 divide-x divide-slate-200' : 'grid-cols-1'}`}>
            {calendarDays.map((date) => {
              const dateSessions = visibleSessions.filter((session) => session.currentDate === date);
              const isToday = date === getQatarToday();
              const dateValue = new Date(`${date}T12:00:00Z`);
              const dayName = new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
                weekday: 'long',
                timeZone: 'Asia/Qatar',
              }).format(dateValue);
              return (
                <section key={date} className="min-h-[460px] border-b border-slate-200 last:border-b-0">
                  <header className={`sticky top-0 z-10 border-b border-slate-100 px-3 py-3 text-center ${isToday ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                    <p className={`text-xs font-bold ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>{dayName}</p>
                    <p className={`mt-1 text-sm ${isToday ? 'font-extrabold text-indigo-700' : 'font-semibold text-slate-800'}`}>{formatDate(date)}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{dateSessions.length} {t('teacher.classes')}</p>
                  </header>
                  <div className="space-y-2 p-2">
                    {dateSessions.map((session) => {
                      const missing = hasMissingAttendance(session);
                      const timing = getTiming(session);
                      const groupName = language === 'ar' ? session.groupNameAr || session.groupName : session.groupName;
                      const courseName = language === 'ar' ? session.course?.nameAr || session.course?.name : session.course?.name;
                      const sessionCard = (
                        <>
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[11px] font-extrabold text-slate-800">{formatTime(session.scheduledStartAt, language)}</span>
                            <span className={`h-2 w-2 shrink-0 rounded-full ${timing === t('teacher.current') ? 'bg-emerald-500' : timing === t('teacher.ended') ? 'bg-slate-400' : 'bg-indigo-500'}`} />
                          </div>
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-900">{groupName}</p>
                          <p className="mt-1 truncate text-[10px] text-slate-500">{courseName || t('teacher.courseUnavailable')}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {session.status === 'cancelled' ? (
                              <span className="rounded-md bg-rose-100 px-1.5 py-1 text-[9px] font-bold text-rose-800">{t('session.cancelled')}</span>
                            ) : (
                              <span className={`rounded-md px-1.5 py-1 text-[9px] font-bold ${missing ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                {missing ? t('teacher.attendanceMissing') : t('teacher.attendanceRecorded')}
                              </span>
                            )}
                            <span className="rounded-md bg-white/80 px-1.5 py-1 text-[9px] font-semibold text-slate-500">{timing}</span>
                          </div>
                          <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock3 className="h-3 w-3" />{formatTime(session.scheduledStartAt, language)}–{formatTime(session.scheduledEndAt, language)}
                          </p>
                          {session.status !== 'cancelled' && (
                            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700">
                              <UserCheck className="h-3 w-3" />{t('teacher.recordAttendance')}
                            </span>
                          )}
                        </>
                      );
                      return session.status !== 'cancelled' ? (
                        <Link
                          key={session._id}
                          to={`/attendance/${encodeURIComponent(session._id)}`}
                          className={`block rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${missing ? 'border-amber-200 bg-amber-50/70 hover:border-amber-300' : 'border-indigo-100 bg-indigo-50/70 hover:border-indigo-200'}`}
                        >
                          {sessionCard}
                        </Link>
                      ) : (
                        <article key={session._id} className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 opacity-80">
                          {sessionCard}
                        </article>
                      );
                    })}
                    {dateSessions.length === 0 && (
                      <p className="py-8 text-center text-[11px] text-slate-300">{t('teacher.noClassesThisDay')}</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
