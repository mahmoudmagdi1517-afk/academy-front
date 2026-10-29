import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Phone, Search, Users } from 'lucide-react';
import { academicApi } from '../api/academic.api';
import { GroupRoster } from '../types/academic';
import { Badge } from '../components/common/Badge';
import { DataTable, DataTableColumn } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/date';

type GroupRosterStudent = GroupRoster['students'][number];

export const GroupDetailsPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { t, language } = useLanguage();
  const { error } = useToast();
  const [roster, setRoster] = useState<GroupRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!groupId) return;
    let active = true;
    setLoading(true);
    academicApi.getGroupRoster(groupId)
      .then((data) => {
        if (active) setRoster(data);
      })
      .catch((err: Error) => {
        if (active) error(err.message || t('group.rosterLoadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [groupId, error, t]);

  const students = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return roster?.students || [];
    return (roster?.students || []).filter(({ student }) =>
      [student.name, student.nameAr, student.studentCode, student.phone, student.email]
        .some((value) => value?.toLocaleLowerCase().includes(query))
    );
  }, [roster, search]);

  const columns: DataTableColumn<GroupRosterStudent>[] = [
    {
      key: 'student',
      header: t('group.student'),
      render: ({ student }) => (
        <div>
          <div className="font-bold text-slate-800">{student.name}</div>
          {student.nameAr && <div className="text-[11px] text-slate-400">{student.nameAr}</div>}
          <div className="text-[11px] font-mono text-indigo-600 mt-0.5">{student.studentCode}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: t('group.contact'),
      render: ({ student }) => (
        <div className="space-y-1">
          {student.phone ? (
            <a href={`tel:${student.phone}`} className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800">
              <Phone className="w-3.5 h-3.5" />
              {student.phone}
            </a>
          ) : <span className="text-slate-400">—</span>}
          {student.email && <div className="text-[11px] text-slate-500">{student.email}</div>}
        </div>
      ),
    },
    {
      key: 'lessons',
      header: t('group.lessons'),
      render: ({ lessonsPurchased, lessonsRemaining }) => (
        <span>
          {lessonsRemaining ?? '—'} / {lessonsPurchased ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: ({ status }) => (
        <Badge variant={status === 'active' ? 'success' : 'neutral'} size="sm">
          {t(`sub.${status === 'active' ? 'paidActive' : 'paidFinished'}`)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('group.backToGroups')}
      </Link>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">{t('common.loading')}</div>
      ) : !roster ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState title={t('group.notFound')} description={t('group.rosterLoadError')} icon={Users} />
        </div>
      ) : (
        <>
          <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-indigo-600">{t('group.details')}</p>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                  {roster.group.name}
                </h2>
                {roster.group.nameAr && (
                  <p className="text-sm text-slate-500 mt-1">{roster.group.nameAr}</p>
                )}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm">
                <Users className="w-4 h-4" />
                {roster.students.length} {t('group.students')}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-600">
              <span>
                {t('group.startsOn')}: <strong className="text-slate-800">
                  {roster.group.startDate ? formatDate(roster.group.startDate) : '—'}
                </strong>
              </span>
              <span>
                <strong className="text-slate-800">{roster.group.sessionCount || '—'}</strong> {t('group.sessions')}
              </span>
              {roster.group.capacity != null && (
                <span>{t('group.capacity')}: <strong className="text-slate-800">{roster.group.capacity}</strong></span>
              )}
            </div>
            {roster.group.schedules?.length ? (
              <div className="mt-4 flex items-start gap-2 text-xs text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {roster.group.schedules.map((slot) => (
                    <span key={slot._id || `${slot.dayOfWeek}-${slot.startTime}`}>
                      {t(`day.${['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][slot.dayOfWeek]}`)}
                      {' · '}{slot.startTime}–{slot.endTime}
                      {slot.teacherName
                        ? ` · ${language === 'ar' ? slot.teacherNameAr || slot.teacherName : slot.teacherName}`
                        : ''}
                    </span>
                  ))}
                </div>
              </div>
            ) : roster.group.scheduleNote ? (
              <p className="mt-4 text-xs text-slate-600">{roster.group.scheduleNote}</p>
            ) : null}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900">{t('group.students')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('group.rosterSubtitle')}</p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('group.searchStudents')}
                  className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
            {students.length === 0 ? (
              <EmptyState
                title={search ? t('group.noMatchingStudents') : t('group.noStudents')}
                description={search ? t('group.tryDifferentSearch') : t('group.noStudentsDescription')}
                icon={Users}
              />
            ) : (
              <DataTable rows={students} columns={columns} rowKey={(row) => row.subscriptionId} />
            )}
          </section>
        </>
      )}
    </div>
  );
};
