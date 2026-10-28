import { AttendanceStatus, TeacherReport } from '../types/session';

export type TeacherReportSession = TeacherReport['sessions'][number];

export interface StudentAttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
  attendanceRate: number;
}

export function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function getWeekStart(date: string): string {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

export function getStudentAttendanceSummary(
  sessions: TeacherReportSession[],
  studentId: string,
): StudentAttendanceSummary {
  const summary: StudentAttendanceSummary = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    unmarked: 0,
    attendanceRate: 0,
  };

  sessions.forEach((session) => {
    if (session.status === 'cancelled' || !session.students.some((student) => student._id === studentId)) {
      return;
    }
    const record = session.attendance.find((item) => item.studentId === studentId);
    if (record) {
      summary[record.status as AttendanceStatus] += 1;
    } else {
      summary.unmarked += 1;
    }
  });

  const counted = summary.present + summary.absent + summary.late;
  summary.attendanceRate = counted > 0
    ? Math.round(((summary.present + summary.late) / counted) * 100)
    : 0;
  return summary;
}

export function hasMissingAttendance(session: TeacherReportSession): boolean {
  return session.status !== 'cancelled' &&
    session.students.some((student) =>
      !session.attendance.some((record) => record.studentId === student._id)
    );
}

export function formatTime(value?: string | null, language: 'en' | 'ar' = 'en'): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
    timeZone: 'Asia/Qatar',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
