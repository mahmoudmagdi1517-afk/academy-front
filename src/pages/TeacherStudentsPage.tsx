import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Users } from 'lucide-react';
import { academicApi } from '../api/academic.api';
import { TeacherRoster } from '../types/academic';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

type RosterGroup = TeacherRoster['groups'][number];
type RosterStudent = RosterGroup['students'][number];

export const TeacherStudentsPage: React.FC = () => {
  const { success, error } = useToast();
  const { t } = useLanguage();
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferTarget, setTransferTarget] = useState<{
    group: RosterGroup;
    enrollment: RosterStudent;
  } | null>(null);
  const [newGroupId, setNewGroupId] = useState('');
  const [transferring, setTransferring] = useState(false);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const data = await academicApi.listTeacherRoster();
      setGroups(data.groups);
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
          {groups.map((group) => (
            <section key={group._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900">{group.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {group.students.length} {t('teacher.studentsWithLessons')}
                  </p>
                </div>
              </div>
              {group.students.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400">{t('teacher.noStudentsWithLessons')}</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {group.students.map((enrollment) => (
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
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-slate-600">
                          <span className="font-bold text-indigo-600">{enrollment.lessonsRemaining}</span>
                          {' '}of {enrollment.lessonsPurchased} {t('teacher.lessonsRemaining')}
                        </div>
                        {groups.some((candidate) =>
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
                  ))}
                </div>
              )}
            </section>
          ))}
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
