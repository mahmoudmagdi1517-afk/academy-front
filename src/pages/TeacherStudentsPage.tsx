import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Search, Users } from 'lucide-react';
import { academicApi } from '../api/academic.api';
import { sessionApi } from '../api/session.api';
import { TeacherRoster } from '../types/academic';
import { TeacherReport } from '../types/session';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { getQatarToday } from '../utils/date';
import { getStudentAttendanceSummary } from '../utils/teacher';

type RosterGroup = TeacherRoster['groups'][number];
type RosterStudent = RosterGroup['students'][number];

export const TeacherStudentsPage: React.FC = () => {
  const { success, error } = useToast();
  const { t, language } = useLanguage();
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferTarget, setTransferTarget] = useState<{
    group: RosterGroup;
    enrollment: RosterStudent;
  } | null>(null);
  const [newGroupId, setNewGroupId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [reportSessions, setReportSessions] = useState<TeacherReport['sessions']>([]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const [data, report] = await Promise.all([
        academicApi.listTeacherRoster(),
        sessionApi.getTeacherReport({ fromDate: '2000-01-01', toDate: getQatarToday() }),
      ]);
      setGroups(data.groups);
      setReportSessions(report.sessions);
    } catch (err: any) {
      error(err.message || 'Failed to load your students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const handleTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferTarget || !newGroupId) return;
    setTransferring(true);
    try {
      await academicApi.transferTeacherStudent(
        transferTarget.enrollment.subscriptionId,
        newGroupId,
      );
      success('Student transferred. Remaining lessons and payment plan were preserved.');
      setTransferTarget(null);
      setNewGroupId('');
      await loadRoster();
    } catch (err: any) {
      error(err.message || 'Failed to transfer student');
    } finally {
      setTransferring(false);
    }
  };

  const studentRows = groups.flatMap((group) =>
    group.students
      .filter(() => !selectedGroup || group._id === selectedGroup)
      .filter(({ student }) => {
        const term = search.trim().toLocaleLowerCase();
        return !term ||
          student.name.toLocaleLowerCase().includes(term) ||
          (student.nameAr || '').includes(search.trim()) ||
          student.studentCode.toLocaleLowerCase().includes(term);
      })
      .map((enrollment) => ({ group, enrollment }))
  );
  const totalStudents = new Set(groups.flatMap((group) => group.students.map(({ student }) => student._id))).size;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {t('nav.myStudents')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {t('teacher.studentsSubtitle')}
        </p>
      </header>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">{t('teacher.loading')}</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={Users}
            title={t('teacher.noGroupsTitle')}
            description={t('teacher.noGroupsDescription')}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
              <p className="text-xs font-semibold text-indigo-700">{t('teacher.totalStudents')}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{totalStudents}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5">
              <p className="text-xs font-semibold text-sky-700">{t('teacher.myGroupsCount')}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{groups.length}</p>
            </div>
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)]">
              <label className="relative block">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('teacher.searchStudents')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 ps-10 pe-4 text-sm outline-hidden transition focus:border-indigo-400 focus:bg-white"
                />
              </label>
              <select
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
                aria-label={t('teacher.filterGroup')}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              >
                <option value="">{t('teacher.allGroups')}</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>{language === 'ar' ? group.nameAr || group.name : group.name}</option>
                ))}
              </select>
            </div>
            {studentRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">{t('teacher.noFilteredStudents')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-start">{t('teacher.student')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.group')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.attendanceRate')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.absences')} / {t('teacher.lateCount')}</th>
                      <th className="px-5 py-3 text-start">{t('teacher.lessonsRemaining')}</th>
                      <th className="px-5 py-3 text-start">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentRows.map(({ group, enrollment }) => {
                      const groupSessions = reportSessions.filter((session) => session.groupId === group._id);
                      const summary = getStudentAttendanceSummary(groupSessions, enrollment.student._id);
                      const history = reportSessions
                        .filter((session) => session.groupId === group._id && session.students.some((student) => student._id === enrollment.student._id))
                        .flatMap((session) => {
                          const record = session.attendance.find((item) => item.studentId === enrollment.student._id);
                          return record ? [{ session, record }] : [];
                        })
                        .sort((left, right) => right.session.currentDate.localeCompare(left.session.currentDate));
                      return (
                        <tr key={enrollment.subscriptionId} className="align-top transition hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-800">{language === 'ar' ? enrollment.student.nameAr || enrollment.student.name : enrollment.student.name}</p>
                            <p className="mt-1 font-mono text-xs text-slate-500">{enrollment.student.studentCode}</p>
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs font-semibold text-indigo-700">{t('teacher.viewAttendanceHistory')}</summary>
                              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600">
                                {history.length ? history.map(({ session, record }) => (
                                  <li key={record._id}>{session.currentDate} · {t(`session.${record.status}`)}</li>
                                )) : <li>{t('teacher.noAttendanceHistory')}</li>}
                              </ul>
                            </details>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-700">{language === 'ar' ? group.nameAr || group.name : group.name}</p>
                            <p className="mt-1 text-xs text-indigo-700">{language === 'ar' ? group.course?.nameAr || group.course?.name : group.course?.name}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{summary.attendanceRate}%</span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            <span className="font-semibold text-rose-600">{summary.absent}</span>
                            {' / '}
                            <span className="font-semibold text-amber-600">{summary.late}</span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            <span className="font-bold text-slate-800">{enrollment.lessonsRemaining ?? '—'}</span>
                            {' / '}{enrollment.lessonsPurchased ?? '—'}
                          </td>
                          <td className="px-5 py-4">
                            {enrollment.lessonsRemaining > 0 && groups.some((candidate) =>
                              candidate.courseId === group.courseId && candidate._id !== group._id
                            ) && (
                              <button
                                onClick={() => { setTransferTarget({ group, enrollment }); setNewGroupId(''); }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                {t('teacher.moveGroup')}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              {studentRows.length} {t('teacher.students')}
            </div>
          </section>
        </>
      )}

      <Modal
        isOpen={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        title={t('teacher.moveTitle')}
        maxWidth="md"
      >
        <form onSubmit={handleTransfer} className="space-y-4 text-xs">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900">
            <div className="font-bold">{transferTarget?.enrollment.student.name}</div>
            <div className="mt-1">
              {transferTarget?.enrollment.lessonsRemaining} {t('teacher.remainingMovePolicy')}
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('teacher.destinationGroup')} *</label>
            <SearchableSelect
              required
              value={newGroupId}
              onChange={setNewGroupId}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            >
              <option value="">{t('teacher.chooseGroup')}</option>
              {groups
                .filter((group) =>
                  group.courseId === transferTarget?.group.courseId &&
                  group._id !== transferTarget?.group._id
                )
                .map((group) => (
                  <option key={group._id} value={group._id}>{group.name}</option>
                ))}
            </SearchableSelect>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTransferTarget(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t('teacher.cancel')}
            </button>
            <button
              type="submit"
              disabled={transferring || !newGroupId}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {transferring ? t('teacher.moving') : t('teacher.confirmMove')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
