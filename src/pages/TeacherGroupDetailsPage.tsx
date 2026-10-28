import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { academicApi } from '../api/academic.api';
import { sessionApi } from '../api/session.api';
import { TeacherRoster } from '../types/academic';
import { TeacherReport } from '../types/session';
import { EmptyState } from '../components/common/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatDate, getQatarToday } from '../utils/date';
import { getStudentAttendanceSummary } from '../utils/teacher';

type TeacherGroup = TeacherRoster['groups'][number];

export const TeacherGroupDetailsPage: React.FC = () => {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const { t, language } = useLanguage();
  const { error } = useToast();
  const [group, setGroup] = useState<TeacherGroup | null>(null);
  const [sessions, setSessions] = useState<TeacherReport['sessions']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      academicApi.listTeacherRoster(),
      sessionApi.getTeacherReport({ fromDate: '2000-01-01', toDate: getQatarToday(), groupId }),
    ])
      .then(([roster, report]) => {
        setGroup(roster.groups.find((item) => item._id === groupId) || null);
        setSessions(report.sessions);
      })
      .catch((err: Error) => error(err.message || t('common.error')))
      .finally(() => setLoading(false));
  }, [error, groupId, t]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">{t('common.loading')}</div>;
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <Link to="/my-groups" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
          <ArrowLeft className="h-4 w-4" /> {t('teacher.backToGroups')}
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState icon={BookOpen} title={t('teacher.groupNotFound')} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/my-groups" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
        <ArrowLeft className="h-4 w-4" /> {t('teacher.backToGroups')}
      </Link>
      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {language === 'ar' ? group.nameAr || group.name : group.name}
        </h1>
        <p className="mt-1 text-indigo-700">
          {language === 'ar' ? group.course?.nameAr || group.course?.name : group.course?.name || t('teacher.courseUnavailable')}
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-800">{t('teacher.groupStudents')}</h2>
          <span className="text-xs font-semibold text-slate-500">{group.students.length}</span>
        </div>
        {group.students.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">{t('teacher.noStudents')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {group.students.map((enrollment) => {
              const summary = getStudentAttendanceSummary(sessions, enrollment.student._id);
              return (
                <article key={enrollment.subscriptionId} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {language === 'ar' ? enrollment.student.nameAr || enrollment.student.name : enrollment.student.name}
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{enrollment.student.studentCode}</p>
                      <p className="mt-2 text-xs text-slate-600">
                        {t('teacher.lessonsRemaining')}: {enrollment.lessonsRemaining} / {enrollment.lessonsPurchased}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>{t('teacher.attendanceRate')}: <b>{summary.attendanceRate}%</b></span>
                    <span>{t('teacher.absences')}: <b>{summary.absent}</b></span>
                    <span>{t('teacher.lateCount')}: <b>{summary.late}</b></span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <p className="text-xs text-slate-400">{t('teacher.attendanceThrough')} {formatDate(getQatarToday())}</p>
    </div>
  );
};
