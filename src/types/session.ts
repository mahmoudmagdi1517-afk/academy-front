export type SessionStatus = 'scheduled' | 'postponed' | 'cancelled' | 'completed';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  _id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  recordedBy: string;
  recordedAt: string;
  note?: string | null;
}

export interface Session {
  _id: string;
  groupId: string;
  scheduleSlotId?: string | null;
  originalDate: string; // YYYY-MM-DD
  currentDate: string; // YYYY-MM-DD
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  teacherEmployeeId?: string | null;
  status: SessionStatus;
  notes?: string | null;
  postponeReason?: string | null;
  cancelReason?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDetail {
  session: Session;
  attendance: AttendanceRecord[];
  students: Array<{
    _id: string;
    studentCode: string;
    name: string;
    nameAr?: string | null;
  }>;
}

export interface TeacherDashboard {
  groups: Array<{
    _id: string;
    name: string;
    nameAr?: string | null;
    students: Array<{
      _id: string;
      studentCode: string;
      name: string;
      nameAr?: string | null;
    }>;
  }>;
  sessions: Array<Session & {
    attendance: Array<{
      studentId: string;
      status: AttendanceStatus;
    }>;
  }>;
}

export interface TeacherReport {
  groups: Array<{
    _id: string;
    name: string;
    nameAr?: string | null;
    courseId: string;
    schedules: Array<{
      _id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
    course: {
      _id: string;
      name: string;
      nameAr?: string | null;
    } | null;
  }>;
  sessions: Array<Session & {
    groupName: string;
    groupNameAr?: string | null;
    course: {
      _id: string;
      name: string;
      nameAr?: string | null;
    } | null;
    students: Array<{
      _id: string;
      studentCode: string;
      name: string;
      nameAr?: string | null;
    }>;
    attendance: Array<{
      _id: string;
      sessionId: string;
      studentId: string;
      status: AttendanceStatus;
      markedBy: string;
      createdAt: string;
      updatedAt: string;
      audit: Array<{
        at: string;
        actorId: string;
        fromStatus: string | null;
        toStatus: AttendanceStatus;
      }>;
    }>;
  }>;
}

export interface MakeupSession {
  _id: string;
  studentId: string;
  groupId: string;
  sourceSessionId?: string | null;
  scheduledDate: string;
  notes?: string | null;
  pricingType: 'free' | 'paid';
  feeAmount: number;
  isMissed: boolean;
  createdAt: string;
  updatedAt: string;
}
