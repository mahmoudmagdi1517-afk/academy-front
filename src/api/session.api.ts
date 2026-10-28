import { api } from './client';
import { MakeupSession, Session, SessionDetail, AttendanceRecord, TeacherDashboard, TeacherReport } from '../types/session';

export const sessionApi = {
  listSessions: (params?: { groupId?: string; currentDate?: string; fromDate?: string; status?: string }) =>
    api.get<Session[]>('/api/sessions', params),

  getTeacherDashboard: (currentDate: string) =>
    api.get<TeacherDashboard>('/api/sessions/teacher-dashboard', { currentDate }),

  getTeacherReport: (params?: {
    fromDate?: string;
    toDate?: string;
    groupId?: string;
    studentId?: string;
  }) => api.get<TeacherReport>('/api/sessions/teacher-report', params),

  getSession: (id: string) =>
    api.get<SessionDetail>(`/api/sessions/${id}`),

  createSession: (data: {
    groupId: string;
    originalDate: string;
    startTime: string;
    endTime: string;
    teacherEmployeeId?: string | null;
    notes?: string | null;
  }) => api.post<Session>('/api/sessions', data),

  postponeSession: (id: string, data: { toDate: string; reason?: string | null }) =>
    api.post<Session>(`/api/sessions/${id}/postpone`, data),

  cancelSession: (id: string, reason?: string | null) =>
    api.post<Session>(`/api/sessions/${id}/cancel`, { reason }),

  saveAttendanceBatch: (
    sessionId: string,
    attendance: Array<{
      studentId: string;
      status: 'present' | 'absent' | 'late' | 'excused' | null;
      note?: string | null;
    }>
  ) => api.post<AttendanceRecord[]>(`/api/sessions/${sessionId}/attendance/batch`, { attendance }),

  closeSession: (id: string) =>
    api.post<Session>(`/api/sessions/${id}/close`),

  // Makeups
  listMakeups: (params?: { studentId?: string }) =>
    api.get<MakeupSession[]>('/api/sessions/makeups', params),

  createMakeup: (data: {
    studentId: string;
    groupId: string;
    sourceSessionId?: string | null;
    scheduledDate: string;
    notes?: string | null;
  }) => api.post<MakeupSession>('/api/sessions/makeups', data),

  markMakeupMissed: (id: string) =>
    api.post<MakeupSession>(`/api/sessions/makeups/${id}/missed`),
};
