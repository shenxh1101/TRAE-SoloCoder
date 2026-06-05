const API_BASE = 'http://localhost:3001/api';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  onLoading?: (loading: boolean) => void;
  cache?: boolean;
  cacheTTL?: number;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheItem<unknown>>();

function getCacheKey(method: string, url: string, params?: Record<string, unknown>): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${method}:${url}:${paramStr}`;
}

function getCachedData<T>(key: string): T | null {
  const item = cache.get(key) as CacheItem<T> | undefined;
  if (!item) return null;

  const now = Date.now();
  if (now - item.timestamp > item.ttl * 1000) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

function setCacheData<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

function clearAuth(): void {
  try {
    localStorage.removeItem('token');
    window.location.href = '/login';
  } catch {
    console.error('Failed to clear auth and redirect');
  }
}

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public response?: ApiResponse<unknown>
  ) {
    super(response?.message || `${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type') || '';
  
  if (!response.ok) {
    let errorMessage = response.statusText;
    
    if (contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        
        if (response.status === 401) {
          clearAuth();
        }
        
        throw new ApiError(response.status, response.statusText, errorData);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
    
    if (response.status === 401) {
      clearAuth();
    }
    
    throw new ApiError(response.status, response.statusText);
  }
  
  if (contentType.includes('application/json')) {
    return response.json();
  }
  
  if (contentType.includes('text/')) {
    return { 
      code: 0, 
      message: 'success', 
      data: await response.text() as unknown as T 
    };
  }
  
  return { code: 0, message: 'success', data: await response.blob() as unknown as T };
}

export async function request<T>(
  method: string,
  url: string,
  data?: unknown,
  options?: RequestConfig
): Promise<ApiResponse<T>> {
  const startTime = Date.now();
  
  try {
    options?.onLoading?.(true);

    const isGet = method.toUpperCase() === 'GET';
    const shouldCache = isGet && (options?.cache !== false);
    const cacheTTL = options?.cacheTTL ?? 300; // 默认5分钟

    if (shouldCache) {
      const cacheKey = getCacheKey(method, url, data as Record<string, unknown>);
      const cached = getCachedData<ApiResponse<T>>(cacheKey);
      if (cached) {
        if (import.meta.env.DEV) {
          console.log(`[API Cache HIT] ${method} ${url}`, Date.now() - startTime, 'ms');
        }
        return cached;
      }
    }

    let fullUrl = `${API_BASE}${url}`;
    
    if (isGet && data) {
      const params = new URLSearchParams();
      Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        fullUrl += `?${queryString}`;
      }
    }

    const token = getToken();
    const headers: Record<string, string> = {
      ...(options?.headers || {}),
    };

    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit & { signal?: AbortSignal } = {
      method,
      headers,
    };

    if (!isGet && data) {
      fetchOptions.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    if (options?.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), options.timeout);
      fetchOptions.signal = controller.signal;
    }

    if (import.meta.env.DEV) {
      console.log(`[API Request] ${method} ${fullUrl}`, data ? '(with body)' : '');
    }

    const response = await fetch(fullUrl, fetchOptions);
    const result = await handleResponse<T>(response);

    if (isGet && shouldCache) {
      const cacheKey = getCacheKey(method, url, data as Record<string, unknown>);
      setCacheData(cacheKey, result, cacheTTL);
    }

    if (import.meta.env.DEV) {
      const duration = Date.now() - startTime;
      console.log(`[API Response] ${method} ${fullUrl}`, result.code === 0 ? '✓' : '✗', `${duration}ms`);
    }

    if (!isGet) {
      invalidateCache(url.split('?')[0]);
    }

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Request Timeout');
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(0, '网络连接失败，请检查网络设置');
    }

    throw new ApiError(500, error instanceof Error ? error.message : '未知错误');
  } finally {
    options?.onLoading?.(false);
  }
}

export async function get<T>(
  url: string,
  params?: Record<string, unknown>,
  options?: RequestConfig
): Promise<ApiResponse<T>> {
  return request<T>('GET', url, params, options);
}

export async function post<T>(
  url: string,
  data?: unknown,
  options?: RequestConfig
): Promise<ApiResponse<T>> {
  return request<T>('POST', url, data, options);
}

export async function put<T>(
  url: string,
  data?: unknown,
  options?: RequestConfig
): Promise<ApiResponse<T>> {
  return request<T>('PUT', url, data, options);
}

export async function del<T>(
  url: string,
  options?: RequestConfig
): Promise<ApiResponse<T>> {
  return request<T>('DELETE', url, undefined, options);
}

export async function upload<T>(
  url: string,
  formData: FormData,
  options?: Omit<RequestConfig, 'cache'>
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options?.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return request<T>('POST', url, formData, {
    ...options,
    headers,
    cache: false,
  });
}

export type { ApiError };
