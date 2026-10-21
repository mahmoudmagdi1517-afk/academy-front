import { api } from './client';
import { Course, Group, GroupSchedule, Student, Subscription, TeacherRoster } from '../types/academic';

export const academicApi = {
  listTeacherRoster: () =>
    api.get<TeacherRoster>('/api/teacher/roster'),

  transferTeacherStudent: (subscriptionId: string, newGroupId: string) =>
    api.post<Subscription>(`/api/teacher/subscriptions/${subscriptionId}/transfer-group`, { newGroupId }),

  // Students
  listStudents: (params?: { active?: boolean; q?: string }) =>
    api.get<Student[]>('/api/students', params),

  getStudent: (id: string) =>
    api.get<Student>(`/api/students/${id}`),

  createStudent: (data: {
    studentCode?: string;
    name: string;
    nameAr?: string | null;
    phone?: string | null;
    nationalId?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    notes?: string | null;
  }) => api.post<Student>('/api/students', data),

  // Courses
  listCourses: () =>
    api.get<Course[]>('/api/courses'),

  createCourse: (data: {
    code: string;
    name: string;
    nameAr?: string | null;
    description?: string | null;
    defaultPrice: number;
  }) => api.post<Course>('/api/courses', data),

  updateCourse: (id: string, data: {
    code: string;
    name: string;
    nameAr?: string | null;
    description?: string | null;
    defaultPrice: number;
  }) => api.patch<Course>(`/api/courses/${id}`, data),

  deleteCourse: (id: string) =>
    api.delete<Course>(`/api/courses/${id}`),

  // Groups
  listGroups: (params?: { courseId?: string }) =>
    api.get<Group[]>('/api/groups', params),

  createGroup: (data: {
    courseId: string;
    name: string;
    nameAr?: string | null;
    capacity?: number | null;
    teacherEmployeeId?: string | null;
    startDate: string;
    sessionCount: number;
    schedules: GroupSchedule[];
    scheduleNote?: string | null;
  }) => api.post<Group>('/api/groups', data),

  updateGroup: (id: string, data: {
    name?: string;
    nameAr?: string | null;
    capacity?: number | null;
    teacherEmployeeId?: string | null;
    startDate?: string;
    sessionCount?: number;
    schedules?: GroupSchedule[];
    scheduleNote?: string | null;
  }) => api.patch<Group>(`/api/groups/${id}`, data),

  deleteGroup: (id: string) =>
    api.delete<Group>(`/api/groups/${id}`),

  // Subscriptions
  listSubscriptions: (params?: { studentId?: string; groupId?: string; status?: string }) =>
    api.get<Subscription[]>('/api/subscriptions', params),

  getSubscription: (id: string) =>
    api.get<Subscription>(`/api/subscriptions/${id}`),

  deleteSubscription: (id: string) =>
    api.delete<Subscription>(`/api/subscriptions/${id}`),

  subscribe: (data: {
    studentId: string;
    courseId: string;
    groupId: string;
    price?: number;
    installments?: Array<{ dueDate: string; amount: number }>;
    notes?: string | null;
    initialPayment?: {
      amount: number;
      cashboxId: string;
      method: string;
      notes?: string | null;
    };
  }) => api.post<Subscription>('/api/subscriptions', data),

  transferGroup: (subscriptionId: string, newGroupId: string) =>
    api.post<Subscription>(`/api/subscriptions/${subscriptionId}/transfer-group`, { newGroupId }),

  modifyPlan: (
    subscriptionId: string,
    data: {
      reason: string;
      unpaidRows: Array<{
        _id?: string;
        dueDate: string;
        amount: number;
        paidAmount?: number;
      }>;
    }
  ) => api.post<Subscription>(`/api/subscriptions/${subscriptionId}/plan`, data),
};
