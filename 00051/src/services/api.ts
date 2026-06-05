const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

const getToken = (): string | null => {
  return localStorage.getItem('fleet_token');
};

const apiRequest = async (endpoint: string, options: RequestOptions = {}) => {
  const { requiresAuth = true, headers, ...restOptions } = options;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...restOptions,
  };

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API请求失败 [${endpoint}]:`, error);
    throw error;
  }
};

export const authApi = {
  login: (username: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ username, password }),
    }),
  
  getMe: () => apiRequest('/auth/me'),
};

export const vehicleApi = {
  getAll: (status?: string) =>
    apiRequest(status ? `/vehicles?status=${status}` : '/vehicles'),
  
  getAvailable: (startTime: string, endTime: string, seats?: number) => {
    let url = `/vehicles/available?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
    if (seats) url += `&seats=${seats}`;
    return apiRequest(url);
  },
  
  getById: (id: string) => apiRequest(`/vehicles/${id}`),
  
  create: (data: any) =>
    apiRequest('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  toggleStatus: (id: string) =>
    apiRequest(`/vehicles/${id}/toggle-status`, {
      method: 'PATCH',
    }),
};

export const applicationApi = {
  getAll: (filters?: any) => {
    const params = new URLSearchParams(filters || {}).toString();
    return apiRequest(params ? `/applications?${params}` : '/applications');
  },
  
  getPendingApprovals: () => apiRequest('/applications/pending-approvals'),
  
  getCalendarEvents: () => apiRequest('/applications/calendar-events'),
  
  getById: (id: string) => apiRequest(`/applications/${id}`),
  
  create: (data: any) =>
    apiRequest('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  approve: (id: string, comment?: string) =>
    apiRequest(`/applications/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ comment }),
    }),
  
  reject: (id: string, comment?: string) =>
    apiRequest(`/applications/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ comment }),
    }),
  
  complete: (id: string, actualCost?: number) =>
    apiRequest(`/applications/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ actualCost }),
    }),
};

export const returnApi = {
  getAll: (userId?: string) =>
    apiRequest(userId ? `/returns?userId=${userId}` : '/returns'),
  
  create: (data: any) =>
    apiRequest('/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const maintenanceApi = {
  getAll: (status?: string) =>
    apiRequest(status ? `/maintenance?status=${status}` : '/maintenance'),
  
  create: (data: any) =>
    apiRequest('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateStatus: (id: string, status: string, actualCost?: number) =>
    apiRequest(`/maintenance/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, actualCost }),
    }),
};

export const dashboardApi = {
  getStats: () => apiRequest('/dashboard/stats'),
  getViolations: () => apiRequest('/dashboard/violations'),
  getMonthlyCost: () => apiRequest('/dashboard/monthly-cost'),
  getDepartmentUsage: () => apiRequest('/dashboard/department-usage'),
};

export const reportApi = {
  getMonthlyCost: (months?: number) =>
    apiRequest(months ? `/reports/monthly-cost?months=${months}` : '/reports/monthly-cost'),
  getDepartmentRanking: () => apiRequest('/reports/department-ranking'),
  getVehicleUsage: () => apiRequest('/reports/vehicle-usage'),
  getApplicationsExport: (filters?: any) => {
    const params = new URLSearchParams(filters || {}).toString();
    return apiRequest(params ? `/reports/applications-export?${params}` : '/reports/applications-export');
  },
};

export const uploadApi = {
  uploadPhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/upload/inspection-photo`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) throw new Error('上传失败');
    return response.json();
  },
  
  uploadPhotos: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/upload/inspection-photos`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) throw new Error('上传失败');
    return response.json();
  },
};

export default apiRequest;
