import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/auth';
import { authApi } from '../api/auth.api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('academy_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('academy_access_token');
      if (token) {
        try {
          const freshUser = await authApi.me();
          setUser(freshUser);
          localStorage.setItem('academy_user', JSON.stringify(freshUser));
        } catch {
          // Token invalid or network issue handled by client interceptor
        }
      }
      setIsLoading(false);
    };

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    initAuth();

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('academy_access_token', data.accessToken);
      localStorage.setItem('academy_refresh_token', data.refreshToken);
      localStorage.setItem('academy_user', JSON.stringify(data.user));
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('academy_refresh_token');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout error
      }
    }
    localStorage.removeItem('academy_access_token');
    localStorage.removeItem('academy_refresh_token');
    localStorage.removeItem('academy_user');
    setUser(null);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
