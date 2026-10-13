import { api } from './client';
import { LoginResponse, User } from '../types/auth';

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<LoginResponse>('/api/auth/login', data),

  logout: (refreshToken: string) =>
    api.post('/api/auth/logout', { refreshToken }),

  me: () =>
    api.get<User>('/api/auth/me'),

  createUser: (data: {
    email: string;
    password: string;
    name: string;
    role: string;
    locale?: string;
    employeeId?: string | null;
  }) => api.post<User>('/api/auth/users', data),

  getHealth: () =>
    api.get<{ success: boolean; currency: string; timezone: string }>('/health'),
};
