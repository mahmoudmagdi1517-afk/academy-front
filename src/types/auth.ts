export type UserRole = 'owner' | 'manager' | 'admin' | 'teacher';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  locale?: 'en' | 'ar';
  employeeId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  messageKey?: string;
  details?: any;
}
