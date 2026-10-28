import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sessionApi } from '../api/session.api';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { TeacherReport } from '../types/session';
import { addDays, getStudentAttendanceSummary, hasMissingAttendance } from '../utils/teacher';
import { formatDate, getQatarToday } from '../utils/date';

type ReportSession = TeacherReport['sessions'][number];

export const AttendanceReportsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { error } = useToast();
  const today = getQatarToday();
  const [fromDate, setFromDate] = useState(addDays(today, -30));
  const [toDate, setToDate] = useState(today);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [search, setSearch] = useState('');
  const [report, setReport] = useState<TeacherReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    sessionApi.getTeacherReport({
      fromDate,
      toDate,
      ...(selectedGroup ? { groupId: selectedGroup } : {}),
      ...(selectedStudent ? { studentId: selectedStudent } : {}),
    })
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((err: Error) => {
        if (active) error(err.message || t('common.error'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [error, fromDate, selectedGroup, selectedStudent, t, toDate]);

  const sessions = report?.sessions || [];
  const studentOptions = useMemo(() => {
    const students = new Map<string, { id: string; name: string; code: string }>();
    sessions.forEach((session) => session.students.forEach((student) => {
      students.set(student._id, {
        id: student._id,
        name: language === 'ar' ? student.nameAr || student.name : student.name,
        code: student.studentCode,
      });
    }));
    return [...students.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [language, sessions]);

  const studentRows = useMemo(() => {
    const students = new Map<string, {
      id: string;
      name: string;
      code: string;
      groupId: string;
      groupName: string;
    }>();
    sessions.forEach((session) => session.students.forEach((student) => {
      const key = `${session.groupId}:${student._id}`;
      students.set(key, {
        id: student._id,
        name: language === 'ar' ? student.nameAr || student.name : student.name,
        code: student.studentCode,
        groupId: session.groupId,
        groupName: language === 'ar' ? session.groupNameAr || session.groupName : session.groupName,
      });
    }));
    return [...students.values()]
      .filter((student) => {
        const query = search.trim().toLocaleLowerCase();
        return !query || student.name.toLocaleLowerCase().includes(query) ||
          student.code.toLocaleLowerCase().includes(query) ||
          student.groupName.toLocaleLowerCase().includes(query);
      })
      .map((student) => ({
        ...student,
        summary: getStudentAttendanceSummary(sessions, student.id),
      }))
      .sort((a, b) => b.summary.absent - a.summary.absent);
  }, [language, search, sessions]);

  const missingSessions = sessions.filter(hasMissingAttendance);
  const mostAbsent = studentRows.slice().sort((a, b) => b.summary.absent - a.summary.absent).slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('nav.attendanceReports')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('teacher.reportsSubtitle')}</p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold text-slate-600">
          {t('teacher.fromDate')}
          <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          {t('teacher.toDate')}
          <input type="date" value={toDate} min={fromDate} max={today} onChange={(event) => setToDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          {t('teacher.group')}
          <select value={selectedGroup} onChange={(event) => { setSelectedGroup(event.target.value); setSelectedStudent(''); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">{t('teacher.allGroups')}</option>
            {(report?.groups || []).map((group) => (
              <option key={group._id} value={group._id}>{language === 'ar' ? group.nameAr || group.name : group.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          {t('teacher.student')}
          <select value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">{t('teacher.allStudents')}</option>
            {studentOptions.map((student) => (
              <option key={student.id} value={student.id}>{student.name} · {student.code}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          {t('teacher.search')}
          <span className="relative mt-1 block">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('teacher.searchStudents')} className="w-full rounded-xl border border-slate-200 py-2 ps-9 pe-3 text-sm" />
          </span>
        </label>
      </section>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">{t('common.loading')}</div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                <TrendingDown className="h-4 w-4 text-rose-500" /> {t('teacher.mostAbsences')}
              </h2>
              {mostAbsent.length ? (
                <ul className="divide-y divide-slate-100">
                  {mostAbsent.map((student) => (
                    <li key={`${student.groupId}:${student.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate text-slate-700">{student.name} <span className="text-xs text-slate-400">· {student.groupName}</span></span>
                      <b className="shrink-0 text-rose-600">{student.summary.absent} {t('teacher.absences')}</b>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-400">{t('teacher.noReportStudents')}</p>}
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> {t('teacher.missingAttendanceSessions')}
              </h2>
              {missingSessions.length ? (
                <ul className="space-y-2">
                  {missingSessions.map((session) => (
                    <li key={session._id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-slate-700">
                        {formatDate(session.currentDate)} · {language === 'ar' ? session.groupNameAr || session.groupName : session.groupName}
                      </span>
                      <Link to={`/attendance/${encodeURIComponent(session._id)}`} className="shrink-0 font-bold text-indigo-700 hover:underline">{t('teacher.complete')}</Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">{t('teacher.noMissingAttendance')}</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-800">{t('teacher.studentAttendanceReport')}</h2>
            </div>
            {studentRows.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">{t('teacher.noReportStudents')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-start">{t('teacher.student')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.group')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.attendanceRate')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.absences')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.lateCount')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.unmarkedCount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentRows.map((student) => (
                      <tr key={`${student.groupId}:${student.id}`}>
                        <td className="px-5 py-3 font-semibold text-slate-800">{student.name}<span className="ms-2 font-mono text-xs font-normal text-slate-400">{student.code}</span></td>
                        <td className="px-5 py-3 text-slate-600">{student.groupName}</td>
                        <td className="px-5 py-3 font-semibold text-indigo-700">{student.summary.attendanceRate}%</td>
                        <td className="px-5 py-3 text-rose-600">{student.summary.absent}</td>
                        <td className="px-5 py-3 text-amber-600">{student.summary.late}</td>
                        <td className="px-5 py-3 text-slate-500">{student.summary.unmarked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className="text-xs text-slate-400">{t('teacher.reportRange')}: {formatDate(fromDate)} – {formatDate(toDate)}</p>
        </>
      )}
    </div>
  );
};
