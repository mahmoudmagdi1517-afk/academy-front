import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Plus, Calendar, Clock, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { Course, Group, GroupSchedule } from '../types/academic';
import { Employee } from '../types/hr';
import { academicApi } from '../api/academic.api';
import { hrApi } from '../api/hr.api';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatQAR, qarToFils, filsToQar } from '../utils/currency';
import { getQatarToday, formatDate } from '../utils/date';

export const CoursesPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'courses' | 'groups'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter groups by course
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');

  // Course Modal
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const emptyCourseForm = () => ({
    code: '',
    name: '',
    nameAr: '',
    description: '',
    defaultPriceQar: '',
  });
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    nameAr: '',
    description: '',
    defaultPriceQar: '',
  });

  const openCourseModal = (course?: Course) => {
    setEditingCourse(course || null);
    setCourseForm(
      course
        ? {
            code: course.code,
            name: course.name,
            nameAr: course.nameAr || '',
            description: course.description || '',
            defaultPriceQar: String(filsToQar(course.defaultPrice)),
          }
        : emptyCourseForm()
    );
    setIsCourseModalOpen(true);
  };

  const closeCourseModal = () => {
    setIsCourseModalOpen(false);
    setEditingCourse(null);
    setCourseForm(emptyCourseForm());
  };

  // Group Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const emptyGroupForm = () => ({
    courseId: '',
    name: '',
    nameAr: '',
    capacity: '',
    teacherEmployeeId: '',
    startDate: getQatarToday(),
    sessionCount: '12',
    schedules: [] as GroupSchedule[],
  });
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const weekdays = [
    t('day.monday'),
    t('day.tuesday'),
    t('day.wednesday'),
    t('day.thursday'),
    t('day.friday'),
    t('day.saturday'),
    t('day.sunday'),
  ];
  const timeOptions = Array.from({ length: 48 }, (_, index) => {
    const totalMinutes = index * 30;
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  });

  const openGroupModal = (group?: Group) => {
    setEditingGroup(group || null);
    setGroupForm(
      group
        ? {
            courseId: group.courseId,
            name: group.name,
            nameAr: group.nameAr || '',
            capacity: group.capacity == null ? '' : String(group.capacity),
            teacherEmployeeId: group.teacherEmployeeId || '',
            startDate: group.startDate || getQatarToday(),
            sessionCount: String(group.sessionCount || 12),
            schedules: (group.schedules || []).map(({ _id, dayOfWeek, startTime, endTime }) => ({
              _id,
              dayOfWeek,
              startTime,
              endTime,
            })),
          }
        : emptyGroupForm()
    );
    setIsGroupModalOpen(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesData, groupsData, employeesData] = await Promise.all([
        academicApi.listCourses(),
        academicApi.listGroups(selectedCourseFilter ? { courseId: selectedCourseFilter } : undefined),
        hrApi.listEmployees().catch(() => []),
      ]);
      setCourses(coursesData);
      setGroups(groupsData);
      setTeachers(employeesData.filter((e) => e.isTeacher));
    } catch (err: any) {
      error(err.message || 'Failed to load courses data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourseFilter]);

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.code.trim() || !courseForm.name.trim() || courseForm.defaultPriceQar === '') return;

    setSubmittingCourse(true);
    try {
      const payload = {
        code: courseForm.code.trim().toUpperCase(),
        name: courseForm.name.trim(),
        nameAr: courseForm.nameAr.trim() || null,
        description: courseForm.description.trim() || null,
        defaultPrice: qarToFils(courseForm.defaultPriceQar),
      };
      if (editingCourse) {
        await academicApi.updateCourse(editingCourse._id, payload);
        success(t('course.updated'));
      } else {
        await academicApi.createCourse(payload);
        success('Course created successfully');
      }

      closeCourseModal();
      await loadData();
    } catch (err: any) {
      error(err.message || (editingCourse ? 'Failed to update course' : 'Failed to create course'));
    } finally {
      setSubmittingCourse(false);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!window.confirm(t('course.deleteConfirm'))) return;
    try {
      await academicApi.deleteCourse(course._id);
      success(t('course.archived'));
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to delete course');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.courseId || !groupForm.name) return;
    if (!groupForm.schedules.length) {
      error(t('group.scheduleRequired'));
      return;
    }

    setSubmittingGroup(true);
    try {
      const payload = {
        nameAr: groupForm.nameAr.trim() || null,
        capacity: groupForm.capacity ? parseInt(groupForm.capacity, 10) : null,
        teacherEmployeeId: groupForm.teacherEmployeeId || null,
        startDate: groupForm.startDate,
        sessionCount: Number(groupForm.sessionCount),
        schedules: groupForm.schedules,
      };
      if (editingGroup) {
        await academicApi.updateGroup(editingGroup._id, { ...payload, name: groupForm.name.trim() });
      } else {
        await academicApi.createGroup({
          ...payload,
          courseId: groupForm.courseId,
          name: groupForm.name.trim(),
        });
      }

      success(editingGroup ? 'Group updated successfully' : 'Group created successfully');
      setIsGroupModalOpen(false);
      setEditingGroup(null);
      setGroupForm(emptyGroupForm());
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to create group');
    } finally {
      setSubmittingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!window.confirm(t('group.deleteConfirm'))) return;
    setDeletingGroupId(group._id);
    try {
      await academicApi.deleteGroup(group._id);
      success(t('group.deleted'));
      await loadData();
    } catch (err: any) {
      error(err.message || t('group.deleteError'));
    } finally {
      setDeletingGroupId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t('nav.courses')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Curriculum catalog, tuition fees, and classroom batches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'courses' ? (
            <button
              onClick={() => openCourseModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('course.new')}</span>
            </button>
          ) : (
            <button
              onClick={() => openGroupModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('group.new')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center space-x-2 rtl:space-x-reverse border-b border-slate-200">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold text-xs transition cursor-pointer ${
            activeTab === 'courses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses ({courses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold text-xs transition cursor-pointer ${
            activeTab === 'groups'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Study Groups ({groups.length})</span>
        </button>
      </div>

      {/* Content based on tab */}
      {activeTab === 'courses' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400 font-medium">
              Loading courses catalog...
            </div>
          ) : courses.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No courses added yet"
                description="Add your first academic course with standard pricing in QAR."
                icon={BookOpen}
                actionText="Create Course"
                onAction={() => openCourseModal()}
              />
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course._id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded-lg border border-indigo-100">
                      {course.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={course.isActive ? 'success' : 'neutral'} size="sm">
                        {course.isActive ? 'Active' : 'Archived'}
                      </Badge>
                      <button
                        type="button"
                        aria-label={t('course.edit')}
                        title={t('course.edit')}
                        onClick={() => openCourseModal(course)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {course.isActive && (
                        <button
                          type="button"
                          aria-label={t('course.delete')}
                          title={t('course.delete')}
                          onClick={() => handleDeleteCourse(course)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900">{course.name}</h3>
                  {course.nameAr && (
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{course.nameAr}</p>
                  )}
                  {course.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{course.description}</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">Standard Fee</span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    {formatQAR(course.defaultPrice)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Groups View */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 ps-2">Filter by Course:</span>
            <SearchableSelect
              value={selectedCourseFilter}
              onChange={setSelectedCourseFilter}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </SearchableSelect>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full py-16 text-center text-xs text-slate-400 font-medium">
                Loading groups...
              </div>
            ) : groups.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="No groups created yet"
                  description="Create student groups linked to courses with assigned teachers."
                  icon={Users}
                  actionText="Create Group"
                  onAction={() => openGroupModal()}
                />
              </div>
            ) : (
              groups.map((group) => {
                const parentCourse = courses.find((c) => c._id === group.courseId);
                const teacher = teachers.find((t) => t._id === group.teacherEmployeeId);
                return (
                  <div
                    key={group._id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-indigo-600">
                          {parentCourse?.name || 'Assigned Course'}
                        </span>
                        {group.capacity != null && (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Cap: {group.capacity}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-base text-slate-900">{group.name}</h4>
                      {group.nameAr && (
                        <p className="text-xs text-slate-400 font-medium">{group.nameAr}</p>
                      )}
                      <div className="mt-2 text-[11px] text-slate-500">
                        {t('group.startsOn')}: <span className="font-semibold text-slate-700">{group.startDate ? formatDate(group.startDate) : '—'}</span>
                        <span className="mx-1.5">·</span>
                        <span className="font-semibold text-slate-700">{group.sessionCount || '—'}</span> {t('group.sessions')}
                      </div>

                      {group.schedules?.length ? (
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <ul className="space-y-1">
                            {group.schedules.map((slot) => (
                              <li key={slot._id || `${slot.dayOfWeek}-${slot.startTime}`}>
                                {weekdays[slot.dayOfWeek - 1]} · {slot.startTime}–{slot.endTime}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : group.scheduleNote ? (
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span>{group.scheduleNote}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Teacher:</span>
                      <span className="font-bold text-slate-800">
                        {teacher ? teacher.name : 'Unassigned'}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link
                        to={`/groups/${group._id}`}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-100"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {t('group.viewStudents')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => openGroupModal(group)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t('group.edit')}
                      </button>
                      {group.startDate && group.startDate > getQatarToday() && (
                        <button
                          type="button"
                          aria-label={t('group.delete')}
                          title={t('group.delete')}
                          disabled={deletingGroupId === group._id}
                          onClick={() => handleDeleteGroup(group)}
                          className="inline-flex items-center justify-center px-3 py-2 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Course Modal */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={closeCourseModal}
        title={editingCourse ? t('course.edit') : t('course.new')}
        maxWidth="md"
      >
        <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('course.code')} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ENG-101"
              value={courseForm.code}
              onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-mono uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('course.name')} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cambridge English Level 1"
              value={courseForm.name}
              onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('course.nameAr')}
            </label>
            <input
              type="text"
              dir="rtl"
              placeholder="اسم المادة بالعربية"
              value={courseForm.nameAr}
              onChange={(e) => setCourseForm({ ...courseForm, nameAr: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('course.price')} *
            </label>
            <input
              type="number"
              required
              step="any"
              min="0"
              placeholder="e.g. 500.00"
              value={courseForm.defaultPriceQar}
              onChange={(e) => setCourseForm({ ...courseForm, defaultPriceQar: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('course.desc')}
            </label>
            <textarea
              rows={2}
              placeholder="Course details and syllabus overview"
              value={courseForm.description}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeCourseModal}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingCourse}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submittingCourse ? t('common.loading') : editingCourse ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Group Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
        }}
        title={editingGroup ? t('group.edit') : t('group.new')}
        maxWidth="md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Course *
            </label>
            <SearchableSelect
              required
              disabled={!!editingGroup}
              value={groupForm.courseId}
              onChange={(value) => setGroupForm({ ...groupForm, courseId: value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            >
              <option value="">-- Choose Course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </SearchableSelect>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('group.name')} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Group A - Sun/Tue/Thu"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('group.nameAr')}
            </label>
            <input
              type="text"
              dir="rtl"
              placeholder="اسم المجموعة بالعربية"
              value={groupForm.nameAr}
              onChange={(e) => setGroupForm({ ...groupForm, nameAr: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('group.startDate')} *</label>
              <input
                type="date"
                required
                value={groupForm.startDate}
                onChange={(event) => setGroupForm({ ...groupForm, startDate: event.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('group.sessionCount')} *</label>
              <input
                type="number"
                required
                min="1"
                max="500"
                step="1"
                value={groupForm.sessionCount}
                onChange={(event) => setGroupForm({ ...groupForm, sessionCount: event.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('group.teacher')}
            </label>
            <SearchableSelect
              value={groupForm.teacherEmployeeId}
              onChange={(value) => setGroupForm({ ...groupForm, teacherEmployeeId: value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            >
              <option value="">-- None / TBD --</option>
              {teachers.map((teach) => (
                <option key={teach._id} value={teach._id}>
                  {teach.name} {teach.nameAr ? `(${teach.nameAr})` : ''}
                </option>
              ))}
            </SearchableSelect>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('group.capacity')}
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 15"
              value={groupForm.capacity}
              onChange={(e) => setGroupForm({ ...groupForm, capacity: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="block font-bold text-slate-700">{t('group.schedule')}</label>
              <button
                type="button"
                onClick={() =>
                  setGroupForm({
                    ...groupForm,
                    schedules: [...groupForm.schedules, { dayOfWeek: 1, startTime: '', endTime: '' }],
                  })
                }
                className="inline-flex items-center gap-1 text-indigo-600 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('group.addSchedule')}
              </button>
            </div>
            {groupForm.schedules.map((slot, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2">
                <select
                  required
                  value={slot.dayOfWeek}
                  aria-label={t('group.day')}
                  onChange={(event) => {
                    const schedules = [...groupForm.schedules];
                    schedules[index] = { ...slot, dayOfWeek: Number(event.target.value) };
                    setGroupForm({ ...groupForm, schedules });
                  }}
                  className="min-w-0 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {weekdays.map((day, dayIndex) => (
                    <option key={dayIndex} value={dayIndex + 1}>{day}</option>
                  ))}
                </select>
                <select
                  required
                  value={slot.startTime}
                  aria-label={t('group.startTime')}
                  onChange={(event) => {
                    const schedules = [...groupForm.schedules];
                    schedules[index] = { ...slot, startTime: event.target.value };
                    setGroupForm({ ...groupForm, schedules });
                  }}
                  className="min-w-0 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">{t('group.startTime')}</option>
                  {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
                <select
                  required
                  value={slot.endTime}
                  aria-label={t('group.endTime')}
                  onChange={(event) => {
                    const schedules = [...groupForm.schedules];
                    schedules[index] = { ...slot, endTime: event.target.value };
                    setGroupForm({ ...groupForm, schedules });
                  }}
                  className="min-w-0 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">{t('group.endTime')}</option>
                  {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
                <button
                  type="button"
                  aria-label={t('group.removeSchedule')}
                  onClick={() =>
                    setGroupForm({
                      ...groupForm,
                      schedules: groupForm.schedules.filter((_, rowIndex) => rowIndex !== index),
                    })
                  }
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingGroup}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submittingGroup ? t('common.loading') : editingGroup ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
