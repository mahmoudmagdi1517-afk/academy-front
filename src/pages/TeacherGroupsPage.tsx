import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, Users } from 'lucide-react';
import { academicApi } from '../api/academic.api';
import { TeacherRoster } from '../types/academic';
import { EmptyState } from '../components/common/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

type TeacherGroup = TeacherRoster['groups'][number];

export const TeacherGroupsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { error } = useToast();
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academicApi.listTeacherRoster()
      .then((data) => setGroups(data.groups))
      .catch((err: Error) => error(err.message || t('common.error')))
      .finally(() => setLoading(false));
  }, [error, t]);

  const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('nav.myGroups')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('teacher.groupsSubtitle')}</p>
      </header>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">{t('common.loading')}</div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState icon={BookOpen} title={t('teacher.noGroupsTitle')} description={t('teacher.noGroupsDescription')} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <article key={group._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {language === 'ar' ? group.nameAr || group.name : group.name}
                  </h2>
                  <p className="mt-1 text-sm text-indigo-700">
                    {language === 'ar' ? group.course?.nameAr || group.course?.name : group.course?.name || t('teacher.courseUnavailable')}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                  <Users className="h-3.5 w-3.5" />
                  {group.students.length} {t('teacher.students')}
                </span>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {t('teacher.studyTimes')}
                </p>
                {group.schedules.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {group.schedules.map((slot) => (
                      <li
                        key={slot._id || `${slot.dayOfWeek}-${slot.startTime}`}
                        className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                      >
                        {t(`day.${dayKeys[slot.dayOfWeek]}`)} · {slot.startTime}–{slot.endTime}
                        {slot.teacherName
                          ? ` · ${language === 'ar' ? slot.teacherNameAr || slot.teacherName : slot.teacherName}`
                          : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">{t('teacher.noSchedule')}</p>
                )}
              </div>

              <Link
                to={`/my-groups/${group._id}`}
                className="mt-5 inline-flex items-center rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                {t('teacher.viewGroupDetails')}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
