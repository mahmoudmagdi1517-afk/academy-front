import { ApiResponse } from '../types/auth';

const BASE_URL = "https://back-end-academy-production.up.railway.app";
// const BASE_URL = "http://localhost:5000";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

class ApiError extends Error {
  statusCode: number;
  messageKey?: string;
  details?: any;

  constructor(message: string, statusCode: number, messageKey?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.messageKey = messageKey;
    this.details = details;
  }
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = localStorage.getItem('academy_access_token');
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: reqHeaders,
  };

  try {
    let response = await fetch(url, config);

    // Handle 401 Unauthorized with token refresh
    if (response.status === 401 && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/refresh')) {
      const refreshToken = localStorage.getItem('academy_refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('academy_access_token');
        localStorage.removeItem('academy_refresh_token');
        localStorage.removeItem('academy_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new ApiError('Session expired. Please log in again.', 401);
      }

      if (isRefreshing) {
        // Wait for refresh to complete
        await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        // Retry with new token
        const newToken = localStorage.getItem('academy_access_token');
        if (newToken) {
          reqHeaders['Authorization'] = `Bearer ${newToken}`;
        }
        response = await fetch(url, { ...config, headers: reqHeaders });
      } else {
        isRefreshing = true;
        try {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshData = await refreshRes.json();
          if (!refreshRes.ok || !refreshData.success) {
            throw new Error(refreshData.message || 'Refresh failed');
          }

          localStorage.setItem('academy_access_token', refreshData.data.accessToken);
          localStorage.setItem('academy_refresh_token', refreshData.data.refreshToken);
          localStorage.setItem('academy_user', JSON.stringify(refreshData.data.user));

          isRefreshing = false;
          processQueue(null);

          // Retry original request
          reqHeaders['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
          response = await fetch(url, { ...config, headers: reqHeaders });
        } catch (refreshErr) {
          isRefreshing = false;
          processQueue(refreshErr);
          localStorage.removeItem('academy_access_token');
          localStorage.removeItem('academy_refresh_token');
          localStorage.removeItem('academy_user');
          window.dispatchEvent(new Event('auth:unauthorized'));
          throw new ApiError('Session expired. Please log in again.', 401);
        }
      }
    }

    const json = (await response.json()) as ApiResponse<T>;

    if (!response.ok || json.success === false) {
      let detailMsg = '';
      if (json.details) {
        if (Array.isArray(json.details)) {
          detailMsg = ': ' + json.details.map((d: any) => d.message || d.path).join(', ');
        } else if (typeof json.details === 'object') {
          detailMsg = ': ' + JSON.stringify(json.details);
        }
      }
      throw new ApiError(
        (json.message || 'Request failed') + detailMsg,
        response.status,
        json.messageKey,
        json.details
      );
    }

    return (json.data !== undefined ? json.data : (json as unknown)) as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error occurred', 500);
  }
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>) =>
    request<T>(endpoint, { method: 'GET', params }),
  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
