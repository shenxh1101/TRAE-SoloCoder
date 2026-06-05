const API_BASE_URL = 'http://localhost:3001/api'

let token = localStorage.getItem('token')

function setToken(newToken: string | null) {
  token = newToken
  if (newToken) {
    localStorage.setItem('token', newToken)
  } else {
    localStorage.removeItem('token')
  }
}

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

async function get(endpoint: string): Promise<any> {
  return request(endpoint)
}

async function post(endpoint: string, data?: any): Promise<any> {
  return request(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

async function put(endpoint: string, data?: any): Promise<any> {
  return request(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

async function del(endpoint: string): Promise<any> {
  return request(endpoint, {
    method: 'DELETE',
  })
}

async function uploadFile(endpoint: string, formData: FormData): Promise<any> {
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

const auth = {
  login: (username: string, password: string) =>
    post('/auth/login', { username, password }),
  logout: () =>
    post('/auth/logout'),
  me: () =>
    get('/auth/me'),
}

const claims = {
  getList: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value))
    })
    return get(`/claims?${query.toString()}`)
  },
  getById: (id: string) =>
    get(`/claims/${id}`),
  getStatistics: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value))
    })
    return get(`/claims/statistics?${query.toString()}`)
  },
  getAccidentDistribution: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value))
    })
    return get(`/claims/accident-distribution?${query.toString()}`)
  },
  getBranchPerformance: () =>
    get('/claims/branch-performance'),
  create: (data: any) =>
    post('/claims', data),
  update: (id: string, data: any) =>
    put(`/claims/${id}`, data),
}

const policies = {
  getList: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value))
    })
    return get(`/policies?${query.toString()}`)
  },
  getById: (id: string) =>
    get(`/policies/${id}`),
}

const assessment = {
  getRecords: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value))
    })
    return get(`/assessment/records?${query.toString()}`)
  },
  getRecordById: (id: string) =>
    get(`/assessment/records/${id}`),
  create: (data: any) =>
    post('/assessment/records', data),
  update: (id: string, data: any) =>
    put(`/assessment/records/${id}`, data),
}

const warnings = {
  getList: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value))
    })
    return get(`/warnings?${query.toString()}`)
  },
  getById: (id: string) =>
    get(`/warnings/${id}`),
  acknowledge: (id: string) =>
    put(`/warnings/${id}/acknowledge`),
  resolve: (id: string) =>
    put(`/warnings/${id}/resolve`),
  detect: () =>
    post('/warnings/detect'),
  push: (id: string) =>
    post(`/warnings/${id}/push`),
}

const reports = {
  getMonthly: (month?: string) =>
    get(`/reports/monthly?month=${month || ''}`),
  getByMonth: (month: string) =>
    get(`/reports/${month}`),
  exportPDF: (month: string) =>
    get(`/reports/${month}/export/pdf`),
}

const efficiency = {
  getHandlers: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value))
    })
    return get(`/efficiency/handlers?${query.toString()}`)
  },
  getRejectReasons: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value))
    })
    return get(`/efficiency/reject-reasons?${query.toString()}`)
  },
}

const upload = {
  assessment: (formData: FormData) =>
    uploadFile('/upload/assessment', formData),
}

export default {
  setToken,
  auth,
  claims,
  policies,
  assessment,
  warnings,
  reports,
  efficiency,
  upload,
}
