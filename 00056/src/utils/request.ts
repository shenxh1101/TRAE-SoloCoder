import Taro from '@tarojs/taro';
import { API_BASE_URL, isDev } from '@/config/env';

// API响应数据结构
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}

// 请求配置
export interface RequestConfig extends Taro.request.Option {
  showLoading?: boolean;
  showError?: boolean;
  retryTimes?: number;
  isMock?: boolean;
}

// Token管理
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const getToken = (): string => {
  return Taro.getStorageSync(TOKEN_KEY) || '';
};

export const setToken = (token: string) => {
  Taro.setStorageSync(TOKEN_KEY, token);
};

export const removeToken = () => {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(REFRESH_TOKEN_KEY);
};

export const getRefreshToken = (): string => {
  return Taro.getStorageSync(REFRESH_TOKEN_KEY) || '';
};

export const setRefreshToken = (token: string) => {
  Taro.setStorageSync(REFRESH_TOKEN_KEY, token);
};

// 错误码定义
export const ERROR_CODE = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  TOKEN_EXPIRED: 4001,
  TOKEN_INVALID: 4002
} as const;

// 错误信息映射
const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODE.UNAUTHORIZED]: '未登录，请先登录',
  [ERROR_CODE.FORBIDDEN]: '没有权限访问',
  [ERROR_CODE.NOT_FOUND]: '请求的资源不存在',
  [ERROR_CODE.SERVER_ERROR]: '服务器错误，请稍后重试',
  [ERROR_CODE.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ERROR_CODE.TOKEN_INVALID]: '登录信息无效，请重新登录'
};

// 防止重复请求
const pendingRequests = new Map<string, Promise<any>>();

// 刷新Token锁
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

// 刷新Token
const refreshTokenFn = async (): Promise<string> => {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    throw new Error('No refresh token');
  }

  try {
    const response = await Taro.request({
      url: `${API_BASE_URL}/auth/refresh-token`,
      method: 'POST',
      data: { refreshToken: refreshTokenValue }
    });

    const { code, data } = response.data as ApiResponse<{ token: string; refreshToken: string }>;

    if (code === ERROR_CODE.SUCCESS && data) {
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      return data.token;
    }

    throw new Error('Refresh token failed');
  } catch (error) {
    removeToken();
    throw error;
  }
};

// 处理401错误
const handleUnauthorized = async (config: RequestConfig): Promise<any> => {
  if (isRefreshing) {
    return new Promise(resolve => {
      subscribeTokenRefresh((token: string) => {
        const newConfig = { ...config };
        newConfig.header = newConfig.header || {};
        newConfig.header.Authorization = `Bearer ${token}`;
        resolve(request(newConfig));
      });
    });
  }

  isRefreshing = true;

  try {
    const newToken = await refreshTokenFn();
    isRefreshing = false;
    onRefreshed(newToken);

    config.header = config.header || {};
    config.header.Authorization = `Bearer ${newToken}`;

    return request(config);
  } catch (error) {
    isRefreshing = false;
    refreshSubscribers = [];
    removeToken();

    Taro.showModal({
      title: '登录已过期',
      content: '您的登录状态已过期，请重新登录',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          Taro.navigateTo({ url: '/pages/login/index' });
        }
      }
    });

    return Promise.reject(error);
  }
};

// 主请求方法
export const request = async <T = any>(config: RequestConfig): Promise<T> => {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showLoading = true,
    showError = true,
    retryTimes = 0,
    isMock = false,
    ...rest
  } = config;

  // 生成请求Key，用于防重复
  const requestKey = `${method}_${url}_${JSON.stringify(data)}`;

  // 检查是否已有相同请求
  if (pendingRequests.has(requestKey)) {
    if (isDev) {
      console.log(`[Request] 重复请求，返回已有Promise: ${requestKey}`);
    }
    return pendingRequests.get(requestKey)!;
  }

  // 显示Loading
  if (showLoading) {
    Taro.showLoading({ title: '加载中', mask: true });
  }

  // 构建完整URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const doRequest = async (): Promise<T> => {
    try {
      const headers = { ...header };
      const token = getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      headers['X-Request-Id'] = Date.now().toString();

      if (isDev) {
        console.log(`[Request] ${method} ${fullUrl}`, data);
      }

      const response = await Taro.request({
        url: fullUrl,
        method,
        data,
        header: headers,
        timeout: 30000,
        ...rest
      });

      const result = response.data as ApiResponse<T>;

      if (isDev) {
        console.log(`[Response] ${method} ${fullUrl}`, result);
      }

      if (result.code !== ERROR_CODE.SUCCESS) {
        if (result.code === ERROR_CODE.UNAUTHORIZED ||
            result.code === ERROR_CODE.TOKEN_EXPIRED ||
            result.code === ERROR_CODE.TOKEN_INVALID) {
          return handleUnauthorized(config);
        }

        if (showError) {
          Taro.showToast({
            title: result.message || '请求失败',
            icon: 'none',
            duration: 2000
          });
        }

        return Promise.reject({
          code: result.code,
          message: result.message,
          data: result.data
        });
      }

      return result.data;

    } catch (error: any) {
      console.error(`[Request Error] ${method} ${fullUrl}`, error);

      let errorMessage = '网络连接失败，请检查网络';

      if (error.statusCode) {
        errorMessage = ERROR_MESSAGES[error.statusCode] || `请求失败 (${error.statusCode})`;
      }

      if (error.statusCode === 401) {
        return handleUnauthorized(config);
      }

      if (retryTimes > 0 && error.statusCode >= 500) {
        if (isDev) {
          console.log(`[Request] 重试第 ${retryTimes} 次`);
        }
        return request({ ...config, retryTimes: retryTimes - 1 });
      }

      if (showError) {
        Taro.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        });
      }

      return Promise.reject(error);

    } finally {
      if (showLoading) {
        Taro.hideLoading();
      }
      pendingRequests.delete(requestKey);
    }
  };

  const requestPromise = doRequest();
  pendingRequests.set(requestKey, requestPromise);

  return requestPromise;
};

// 便捷方法
export const http = {
  get: <T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>) =>
    request<T>({ url, method: 'GET', data, ...config }),

  post: <T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>) =>
    request<T>({ url, method: 'POST', data, ...config }),

  put: <T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>) =>
    request<T>({ url, method: 'PUT', data, ...config }),

  delete: <T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>) =>
    request<T>({ url, method: 'DELETE', data, ...config }),

  upload: async <T = any>(url: string, filePath: string, name: string = 'file', formData?: any, config?: any) => {
    const token = getToken();
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const response = await Taro.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header: token ? { Authorization: `Bearer ${token}` } : undefined,
      ...config
    });

    try {
      const result = JSON.parse(response.data) as ApiResponse<T>;
      if (result.code === ERROR_CODE.SUCCESS) {
        return result.data;
      }
      throw new Error(result.message || '上传失败');
    } catch (error) {
      throw error;
    }
  }
};

export default request;
