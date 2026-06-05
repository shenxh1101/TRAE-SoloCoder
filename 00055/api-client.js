const API_BASE = window.API_BASE || 'http://localhost:3002/api';

class ApiClient {
  static async request(url, options = {}) {
    try {
      const resp = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
      return data;
    } catch (err) {
      console.error(`[API] ${url} 请求失败:`, err);
      throw err;
    }
  }

  static async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '上传失败');
    return data;
  }

  static async uploadAndStart(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.rmsThreshold) formData.append('rmsThreshold', options.rmsThreshold);
    if (options.mtfThreshold) formData.append('mtfThreshold', options.mtfThreshold);
    if (options.maxIterations) formData.append('maxIterations', options.maxIterations);
    if (options.adminEmail) formData.append('adminEmail', options.adminEmail);
    const resp = await fetch(`${API_BASE}/upload-and-start`, { method: 'POST', body: formData });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '上传启动失败');
    return data;
  }

  static async getSampleData() {
    return this.request('/sample');
  }

  static async createTask(params) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  static async getTasks() {
    return this.request('/tasks');
  }

  static async getTask(id) {
    return this.request(`/tasks/${id}`);
  }

  static async deleteTask(id) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  static async startTask(id) {
    return this.request(`/tasks/${id}/start`, { method: 'POST' });
  }

  static async pauseTask(id) {
    return this.request(`/tasks/${id}/pause`, { method: 'POST' });
  }

  static async resumeTask(id) {
    return this.request(`/tasks/${id}/resume`, { method: 'POST' });
  }

  static async getTaskLogs(id) {
    return this.request(`/tasks/${id}/logs`);
  }

  static async downloadPDF(id) {
    const resp = await fetch(`${API_BASE}/tasks/${id}/pdf`);
    if (!resp.ok) throw new Error('PDF生成失败');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `光学设计报告_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async downloadRayData(id) {
    const data = await this.request(`/tasks/${id}/raydata`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `光线数据_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return data;
  }

  static async getDashboard() {
    return this.request('/dashboard');
  }

  static async compareTasks(ids) {
    return this.request(`/compare?ids=${ids.join(',')}`);
  }

  static async getUnreadWarnings() {
    return this.request('/warnings/unread');
  }

  static async markWarningRead(id) {
    return this.request(`/warnings/${id}/read`, { method: 'POST' });
  }
}

window.ApiClient = ApiClient;
