export const API_BASE_URL = 'http://localhost:3001/api';
export const WS_URL = 'ws://localhost:3002';

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

async function fetchWrapper<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json() as ApiResponse<T>;
      if (!result.success) {
        throw new Error(result.message || 'Request failed');
      }
      return result.data;
    }

    return await response.blob() as unknown as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error');
  }
}

export const api = {
  get: <T>(url: string, params?: Record<string, unknown> | object) => {
    const queryString = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return fetchWrapper<T>(`${url}${queryString}`, { method: 'GET' });
  },

  post: <T>(url: string, data?: unknown) =>
    fetchWrapper<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data?: unknown) =>
    fetchWrapper<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(url: string) =>
    fetchWrapper<T>(url, { method: 'DELETE' }),
};
