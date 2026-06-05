const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers: headers() });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.error || error.message || `Request failed: ${res.status}`);
  }
  const json = await res.json();
  if (json.success && json.data !== undefined) {
    return json.data as T;
  }
  return json as T;
}

export function get<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'GET' });
}

export function post<T>(url: string, data?: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined });
}

export function patch<T>(url: string, data?: unknown): Promise<T> {
  return request<T>(url, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined });
}

export function del<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' });
}
