const API_BASE = '';

async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    if (mergedOptions.body && typeof mergedOptions.body !== 'string') {
        mergedOptions.body = JSON.stringify(mergedOptions.body);
    }
    
    try {
        const response = await fetch(API_BASE + url, mergedOptions);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API请求失败:', error);
        return { success: false, message: '网络请求失败' };
    }
}

function showMessage(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span>${message}</span>
    `;
    
    const contentArea = document.querySelector('.content-area') || document.querySelector('.container');
    if (contentArea) {
        contentArea.insertBefore(alert, contentArea.firstChild);
    } else {
        document.body.insertBefore(alert, document.body.firstChild);
    }
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return dateString;
}

function showLoading(container) {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.innerHTML = '<div class="spinner"></div><p>加载中...</p>';
    container.innerHTML = '';
    container.appendChild(loading);
}

function updateCurrentTime() {
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleString('zh-CN');
    }
}

if (document.getElementById('loginForm')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const employeeSelect = document.getElementById('employee_id');
        
        try {
            const response = await apiRequest('/auth/employees');
            if (response && Array.isArray(response)) {
                response.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = `${emp.name} (${emp.department} - ${emp.position})`;
                    employeeSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载员工列表失败:', error);
        }
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const employeeId = document.getElementById('employee_id').value;
            if (!employeeId) {
                showMessage('请选择员工', 'error');
                return;
            }
            
            const response = await apiRequest('/auth/login', {
                method: 'POST',
                body: { employee_id: parseInt(employeeId) }
            });
            
            if (response.success) {
                showMessage('登录成功！正在跳转...', 'success');
                setTimeout(() => {
                    if (response.user.role === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/employee';
                    }
                }, 1000);
            } else {
                showMessage(response.message || '登录失败', 'error');
            }
        });
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await apiRequest('/auth/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime();
