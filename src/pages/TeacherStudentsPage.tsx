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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {t('nav.myStudents')}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {t('teacher.studentsSubtitle')}
        </p>
      </div>

      <label className="relative block max-w-lg">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('teacher.searchStudents')}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 ps-10 pe-4 text-sm outline-hidden focus:border-indigo-400"
        />
      </label>

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
        <div className="space-y-5">
          {groups.map((group) => {
            const students = group.students.filter(({ student }) => {
              const term = search.trim().toLocaleLowerCase();
              return !term ||
                student.name.toLocaleLowerCase().includes(term) ||
                (student.nameAr || '').includes(search.trim()) ||
                student.studentCode.toLocaleLowerCase().includes(term);
            });
            if (students.length === 0) return null;
            return (
            <section key={group._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900">{group.name}</h3>
                  <p className="mt-0.5 text-xs text-indigo-700">
                    {language === 'ar' ? group.course?.nameAr || group.course?.name : group.course?.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {students.length} {t('teacher.studentsWithLessons')}
                  </p>
                </div>
              </div>
              {students.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400">{t('teacher.noStudentsWithLessons')}</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {students.map((enrollment) => {
                    const summary = getStudentAttendanceSummary(reportSessions, enrollment.student._id);
                    const history = reportSessions
                      .filter((session) => session.students.some((student) => student._id === enrollment.student._id))
                      .flatMap((session) => {
                        const record = session.attendance.find((item) => item.studentId === enrollment.student._id);
                        return record ? [{ session, record }] : [];
                      })
                      .sort((left, right) => right.session.currentDate.localeCompare(left.session.currentDate));
                    return (
                    <div
                      key={enrollment.subscriptionId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-800">
                          {enrollment.student.name}
                        </div>
                        <div className="text-[11px] font-mono text-indigo-600 mt-0.5">
                          {enrollment.student.studentCode}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span>{t('teacher.attendanceRate')}: {summary.attendanceRate}%</span>
                          <span>{t('teacher.absences')}: {summary.absent}</span>
                          <span>{t('teacher.lateCount')}: {summary.late}</span>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-indigo-700">
                            {t('teacher.viewAttendanceHistory')}
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-slate-600">
                            {history.length ? history.map(({ session, record }) => (
                              <li key={record._id}>
                                {session.currentDate} · {t(`session.${record.status}`)}
                              </li>
                            )) : <li>{t('teacher.noAttendanceHistory')}</li>}
                          </ul>
                        </details>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-slate-600">
                          <span className="font-bold text-indigo-600">{enrollment.lessonsRemaining}</span>
                          {' '}of {enrollment.lessonsPurchased} {t('teacher.lessonsRemaining')}
                        </div>
                        {enrollment.lessonsRemaining > 0 && groups.some((candidate) =>
                          candidate.courseId === group.courseId && candidate._id !== group._id
                        ) && (
                          <button
                            onClick={() => {
                              setTransferTarget({ group, enrollment });
                              setNewGroupId('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            {t('teacher.moveGroup')}
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </section>
            );
          })}
        </div>
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
