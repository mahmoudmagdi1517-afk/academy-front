export interface Student {
  _id: string;
  studentCode: string;
  name: string;
  nameAr?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  _id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  defaultPrice: number; // in fils
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  _id: string;
  courseId: string;
  name: string;
  nameAr?: string | null;
  capacity?: number | null;
  teacherEmployeeId?: string | null;
  startDate?: string | null;
  sessionCount?: number | null;
  schedules?: GroupSchedule[];
  scheduleNote?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupSchedule {
  _id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface Installment {
  _id: string;
  dueDate: string; // YYYY-MM-DD
  amount: number; // fils
  paidAmount: number; // fils
  status: InstallmentStatus;
}

export type SubscriptionStatus = 'active' | 'completed' | 'cancelled' | 'transferred';

export interface Subscription {
  _id: string;
  studentId: string;
  courseId: string;
  groupId: string;
  status: SubscriptionStatus;
  currency: string;
  price: number;
  paidAmount: number;
  remainingAmount: number;
  lessonsPurchased: number | null;
  lessonsRemaining: number | null;
  renewedToSubscriptionId?: string | null;
  groupTransferHistory?: Array<{
    at: string;
    actorId: string;
    fromGroupId: string;
    toGroupId: string;
  }>;
  installments: Installment[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherRoster {
  groups: Array<{
    _id: string;
    name: string;
    nameAr?: string | null;
    courseId: string;
    sessionCount: number;
    students: Array<{
      subscriptionId: string;
      student: Pick<Student, '_id' | 'studentCode' | 'name' | 'nameAr'>;
      courseId: string;
      lessonsPurchased: number;
      lessonsRemaining: number;
    }>;
  }>;
}
