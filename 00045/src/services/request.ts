const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = {
  data?: T;
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
};

const getToken = () => localStorage.getItem('token');

const request = async <T>(
  url: string,
  options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || '请求失败');
  }

  return response.json();
};

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, data?: any) =>
    request<T>(url, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers: data instanceof FormData ? {} : undefined,
    }),
  put: <T>(url: string, data?: any) =>
    request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
  postForm: <T>(url: string, formData: FormData) =>
    request<T>(url, {
      method: 'POST',
      body: formData,
      headers: {},
    }),
};

export default api;
