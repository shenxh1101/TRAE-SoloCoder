const API_BASE = '/_admin/api';
let loadingCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadAllData();
    setInterval(loadAllData, 5000);
});

function showLoading() {
    loadingCount++;
    document.body.style.cursor = 'wait';
}

function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
        document.body.style.cursor = 'default';
    }
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            if (tabId === 'logs') loadLogs();
            if (tabId === 'rate-limit') loadRateLimitStats();
        });
    });
}

async function loadAllData() {
    showLoading();
    try {
        await Promise.all([
            loadRoutes(),
            loadMockRoutes(),
            loadAuthConfig(),
            loadRateLimitConfig(),
            loadGlobalConfig(),
            checkHealth()
        ]);
    } finally {
        hideLoading();
    }
}

async function apiRequest(url, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (data) {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(API_BASE + url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Request Error:', url, error);
        showToast('请求失败: ' + error.message, 'error');
        return null;
    }
}

function showToast(message, type = 'success') {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

async function checkHealth() {
    const result = await apiRequest('/health');
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot');
    
    if (result && result.status === 'healthy') {
        statusText.textContent = '运行中';
        statusDot.style.background = '#4ade80';
    } else {
        statusText.textContent = '异常';
        statusDot.style.background = '#ef4444';
    }
}

async function loadRoutes() {
    const routes = await apiRequest('/routes');
    if (!routes) return;

    const container = document.getElementById('routesList');
    if (routes.length === 0) {
        container.innerHTML = '<div class="card"><p style="color:#94a3b8;text-align:center;">暂无路由配置</p></div>';
        return;
    }

    container.innerHTML = routes.map(route => {
        const hasTransform = route.transform && (Object.keys(route.transform.request || {}).length > 0 || Object.keys(route.transform.response || {}).length > 0);
        return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(route.path_prefix)}</h3>
                <div class="card-actions">
                    <button class="btn btn-small btn-secondary" onclick="editRoute('${escapeHtml(route.path_prefix)}')">编辑</button>
                    <button class="btn btn-small btn-danger" onclick="deleteRoute('${escapeHtml(route.path_prefix)}')">删除</button>
                </div>
            </div>
            <div class="card-body">
                <p><span>后端地址</span> <strong>${escapeHtml(route.backend_url)}</strong></p>
                <p><span>超时</span> <strong>${route.timeout || 30}s</strong></p>
                <p><span>鉴权</span> <span class="badge ${route.auth?.enabled === false ? 'badge-warning' : 'badge-success'}">${route.auth?.enabled === false ? '已禁用' : '已启用'}</span></p>
                <p><span>鉴权方法</span> <strong>${(route.auth?.methods || []).join(', ') || '默认'}</strong></p>
                <p><span>请求/响应转换</span> <span class="badge ${hasTransform ? 'badge-info' : 'badge-warning'}">${hasTransform ? '已配置' : '未配置'}</span></p>
            </div>
        </div>
    `}).join('');
}

function showRouteModal(editPrefix = null) {
    const modal = document.getElementById('routeModal');
    const title = document.getElementById('routeModalTitle');
    
    if (editPrefix) {
        title.textContent = '编辑路由';
        document.getElementById('routeEditPrefix').value = editPrefix;
        apiRequest('/routes' + editPrefix).then(route => {
            if (route) {
                document.getElementById('routePathPrefix').value = route.path_prefix;
                document.getElementById('routeBackendUrl').value = route.backend_url;
                document.getElementById('routeTimeout').value = route.timeout || 30;
                document.getElementById('routeAuthEnabled').checked = route.auth?.enabled !== false;
                document.getElementById('routeAuthMethods').value = (route.auth?.methods || []).join(',');
                
                const transform = route.transform || { request: {}, response: {} };
                document.getElementById('routeTransform').value = JSON.stringify(transform, null, 2);
            }
        });
    } else {
        title.textContent = '添加路由';
        document.getElementById('routeEditPrefix').value = '';
        document.getElementById('routeForm').reset();
        document.getElementById('routeTimeout').value = 30;
        document.getElementById('routeAuthEnabled').checked = true;
        document.getElementById('routeAuthMethods').value = 'api_key,jwt,basic_auth';
        document.getElementById('routeTransform').value = JSON.stringify({
            request: {},
            response: {}
        }, null, 2);
    }
    
    modal.classList.add('show');
}

function editRoute(prefix) {
    showRouteModal(prefix);
}

async function saveRoute() {
    const editPrefix = document.getElementById('routeEditPrefix').value;
    const pathPrefix = document.getElementById('routePathPrefix').value;
    const backendUrl = document.getElementById('routeBackendUrl').value;
    const timeout = parseInt(document.getElementById('routeTimeout').value);
    const authEnabled = document.getElementById('routeAuthEnabled').checked;
    const authMethods = document.getElementById('routeAuthMethods').value.split(',').map(m => m.trim()).filter(m => m);
    
    let transform;
    try {
        transform = JSON.parse(document.getElementById('routeTransform').value);
    } catch (e) {
        showToast('转换配置JSON格式错误: ' + e.message, 'error');
        return;
    }

    if (!pathPrefix || !backendUrl) {
        showToast('请填写路径前缀和后端地址', 'error');
        return;
    }

    const route = {
        path_prefix: pathPrefix.startsWith('/') ? pathPrefix : '/' + pathPrefix,
        backend_url: backendUrl,
        timeout: timeout,
        auth: {
            enabled: authEnabled,
            methods: authMethods
        },
        transform: transform
    };

    showLoading();
    let result;
    try {
        if (editPrefix) {
            result = await apiRequest('/routes' + editPrefix, 'PUT', route);
        } else {
            result = await apiRequest('/routes', 'POST', route);
        }
    } finally {
        hideLoading();
    }

    if (result) {
        showToast(editPrefix ? '路由更新成功' : '路由添加成功');
        closeModal('routeModal');
        loadRoutes();
    }
}

async function deleteRoute(prefix) {
    if (!confirm('确定要删除这个路由吗？删除后相关限流计数器也会被重置。')) return;
    
    showLoading();
    let result;
    try {
        result = await apiRequest('/routes' + prefix, 'DELETE');
    } finally {
        hideLoading();
    }
    
    if (result) {
        showToast('路由删除成功');
        loadRoutes();
        loadRateLimitStats();
    }
}

async function loadMockRoutes() {
    const mockRoutes = await apiRequest('/mock-routes');
    if (!mockRoutes) return;

    const container = document.getElementById('mockRoutesList');
    if (mockRoutes.length === 0) {
        container.innerHTML = '<div class="card"><p style="color:#94a3b8;text-align:center;">暂无Mock路由配置</p></div>';
        return;
    }

    container.innerHTML = mockRoutes.map(mock => `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(mock.path)}</h3>
                <div class="card-actions">
                    <button class="btn btn-small btn-secondary" onclick="editMockRoute('${escapeHtml(mock.path)}')">编辑</button>
                    <button class="btn btn-small btn-danger" onclick="deleteMockRoute('${escapeHtml(mock.path)}')">删除</button>
                </div>
            </div>
            <div class="card-body">
                <p><span>状态码</span> <strong>${mock.status_code || 200}</strong></p>
                <p><span>延迟</span> <strong>${mock.delay_ms || 0}ms</strong></p>
                <p><span>响应体</span> <code style="font-size:11px;">${escapeHtml(JSON.stringify(mock.body || {}).substring(0, 50))}...</code></p>
            </div>
        </div>
    `).join('');
}

function showMockModal(editPath = null) {
    const modal = document.getElementById('mockModal');
    const title = document.getElementById('mockModalTitle');
    
    if (editPath) {
        title.textContent = '编辑Mock路由';
        document.getElementById('mockEditPath').value = editPath;
        apiRequest('/mock-routes' + editPath).then(mock => {
            if (mock) {
                document.getElementById('mockPath').value = mock.path;
                document.getElementById('mockStatusCode').value = mock.status_code || 200;
                document.getElementById('mockHeaders').value = JSON.stringify(mock.headers || {}, null, 2);
                document.getElementById('mockBody').value = JSON.stringify(mock.body || {}, null, 2);
                document.getElementById('mockDelay').value = mock.delay_ms || 0;
            }
        });
    } else {
        title.textContent = '添加Mock路由';
        document.getElementById('mockEditPath').value = '';
        document.getElementById('mockForm').reset();
        document.getElementById('mockStatusCode').value = 200;
        document.getElementById('mockHeaders').value = '{"Content-Type": "application/json"}';
        document.getElementById('mockBody').value = '{"message": "Mock response"}';
        document.getElementById('mockDelay').value = 0;
    }
    
    modal.classList.add('show');
}

function editMockRoute(path) {
    showMockModal(path);
}

async function saveMockRoute() {
    const editPath = document.getElementById('mockEditPath').value;
    const path = document.getElementById('mockPath').value;
    const statusCode = parseInt(document.getElementById('mockStatusCode').value);
    const delay = parseInt(document.getElementById('mockDelay').value);

    let headers, body;
    try {
        headers = JSON.parse(document.getElementById('mockHeaders').value);
        body = JSON.parse(document.getElementById('mockBody').value);
    } catch (e) {
        showToast('JSON格式错误: ' + e.message, 'error');
        return;
    }

    if (!path) {
        showToast('请填写路径', 'error');
        return;
    }

    const mockRoute = {
        path: path.startsWith('/') ? path : '/' + path,
        status_code: statusCode,
        headers: headers,
        body: body,
        delay_ms: delay
    };

    showLoading();
    let result;
    try {
        if (editPath) {
            result = await apiRequest('/mock-routes' + editPath, 'PUT', mockRoute);
        } else {
            result = await apiRequest('/mock-routes', 'POST', mockRoute);
        }
    } finally {
        hideLoading();
    }

    if (result) {
        showToast(editPath ? 'Mock路由更新成功' : 'Mock路由添加成功');
        closeModal('mockModal');
        loadMockRoutes();
    }
}

async function deleteMockRoute(path) {
    if (!confirm('确定要删除这个Mock路由吗？')) return;
    
    showLoading();
    let result;
    try {
        result = await apiRequest('/mock-routes' + path, 'DELETE');
    } finally {
        hideLoading();
    }
    
    if (result) {
        showToast('Mock路由删除成功');
        loadMockRoutes();
    }
}

async function loadAuthConfig() {
    const config = await apiRequest('/auth');
    if (!config) return;

    const container = document.getElementById('authConfig');
    const jwtConfig = config.jwt || {};
    
    container.innerHTML = `
        <div class="form-group">
            <label>API Key 配置 (JSON数组)</label>
            <textarea id="authApiKeys" rows="6" placeholder='[{"name": "X-API-Key", "location": "header", "keys": ["key1", "key2"]}]'>${escapeHtml(JSON.stringify(config.api_keys || [], null, 2))}</textarea>
        </div>
        <h4 style="margin-top:24px;margin-bottom:16px;color:#374151;">JWT 配置</h4>
        <div class="form-group">
            <label>
                <input type="checkbox" id="jwtEnabled" ${jwtConfig.enabled ? 'checked' : ''}> 启用JWT验证
            </label>
        </div>
        <div class="form-group">
            <label>JWT 对称密钥 (HS256/HS384/HS512)</label>
            <textarea id="jwtSecret" rows="2" placeholder="输入对称密钥...">${escapeHtml(jwtConfig.secret || '')}</textarea>
        </div>
        <div class="form-group">
            <label>JWT 公钥 (RS256/RS384/RS512/ES256等非对称算法)</label>
            <textarea id="jwtPublicKey" rows="6" placeholder="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----">${escapeHtml(jwtConfig.public_key || '')}</textarea>
        </div>
        <div class="form-group">
            <label>JWT 算法</label>
            <input type="text" id="jwtAlgorithm" value="${escapeHtml(jwtConfig.algorithm || 'HS256')}" placeholder="HS256, RS256, ES256等">
        </div>
        <div class="form-group">
            <label>支持的算法列表 (逗号分隔)</label>
            <input type="text" id="jwtAlgorithms" value="${escapeHtml((jwtConfig.algorithms || []).join(','))}" placeholder="HS256,RS256">
        </div>
        <div class="form-group">
            <label>JWT 请求头</label>
            <input type="text" id="jwtHeader" value="${escapeHtml(jwtConfig.header || 'Authorization')}">
        </div>
        <div class="form-group">
            <label>JWT 前缀</label>
            <input type="text" id="jwtPrefix" value="${escapeHtml(jwtConfig.prefix || 'Bearer ')}">
        </div>
        <div class="form-group">
            <label>JWT Issuer (颁发者，可选)</label>
            <input type="text" id="jwtIssuer" value="${escapeHtml(jwtConfig.issuer || '')}" placeholder="api-gateway">
        </div>
        <div class="form-group">
            <label>JWT Audience (受众，可选)</label>
            <input type="text" id="jwtAudience" value="${escapeHtml(jwtConfig.audience || '')}" placeholder="gateway-services">
        </div>
        <h4 style="margin-top:24px;margin-bottom:16px;color:#374151;">Basic Auth 配置</h4>
        <div class="form-group">
            <label>
                <input type="checkbox" id="basicAuthEnabled" ${config.basic_auth?.enabled ? 'checked' : ''}> 启用Basic Auth
            </label>
        </div>
        <div class="form-group">
            <label>Basic Auth 用户 (JSON数组，支持password明文或password_hash)</label>
            <textarea id="basicAuthUsers" rows="4" placeholder='[{"username": "admin", "password": "admin123", "roles": ["admin"]}]'>${escapeHtml(JSON.stringify(config.basic_auth?.users || [], null, 2))}</textarea>
        </div>
    `;
}

async function saveAuthConfig() {
    let apiKeys, basicUsers;
    try {
        apiKeys = JSON.parse(document.getElementById('authApiKeys').value);
        basicUsers = JSON.parse(document.getElementById('basicAuthUsers').value);
    } catch (e) {
        showToast('JSON格式错误: ' + e.message, 'error');
        return;
    }

    const algorithmsInput = document.getElementById('jwtAlgorithms').value;
    const algorithms = algorithmsInput ? algorithmsInput.split(',').map(a => a.trim()).filter(a => a) : [document.getElementById('jwtAlgorithm').value];

    const config = {
        api_keys: apiKeys,
        jwt: {
            enabled: document.getElementById('jwtEnabled').checked,
            secret: document.getElementById('jwtSecret').value,
            public_key: document.getElementById('jwtPublicKey').value,
            algorithm: document.getElementById('jwtAlgorithm').value,
            algorithms: algorithms,
            header: document.getElementById('jwtHeader').value,
            prefix: document.getElementById('jwtPrefix').value,
            issuer: document.getElementById('jwtIssuer').value || null,
            audience: document.getElementById('jwtAudience').value || null
        },
        basic_auth: {
            enabled: document.getElementById('basicAuthEnabled').checked,
            users: basicUsers
        }
    };

    showLoading();
    let result;
    try {
        result = await apiRequest('/auth', 'PUT', config);
    } finally {
        hideLoading();
    }
    
    if (result) {
        showToast('鉴权配置保存成功');
        loadAuthConfig();
    }
}

async function loadRateLimitConfig() {
    const config = await apiRequest('/rate-limit');
    if (!config) return;

    const container = document.getElementById('rateLimitConfig');
    const defaultConfig = config.default || {};
    
    container.innerHTML = `
        <div class="form-group">
            <label>
                <input type="checkbox" id="rlEnabled" ${defaultConfig.enabled ? 'checked' : ''}> 启用限流
            </label>
        </div>
        <div class="form-group">
            <label>限流算法</label>
            <select id="rlAlgorithm">
                <option value="token_bucket" ${defaultConfig.algorithm === 'token_bucket' ? 'selected' : ''}>令牌桶 (Token Bucket)</option>
                <option value="leaky_bucket" ${defaultConfig.algorithm === 'leaky_bucket' ? 'selected' : ''}>漏桶 (Leaky Bucket)</option>
            </select>
        </div>
        <div class="form-group">
            <label>桶容量 (capacity)</label>
            <input type="number" id="rlCapacity" value="${defaultConfig.capacity || 100}" min="1">
        </div>
        <div class="form-group">
            <label>速率 (每秒请求数)</label>
            <input type="number" id="rlRate" value="${defaultConfig.rate || 10}" min="1" step="0.1">
        </div>
        <div class="form-group">
            <label>按路由配置 (JSON对象，key为路由前缀，value为该路由的限流配置)</label>
            <textarea id="rlPerRoute" rows="8" placeholder='{"/api/user": {"enabled": true, "algorithm": "token_bucket", "capacity": 50, "rate": 5}}'>${escapeHtml(JSON.stringify(defaultConfig.per_route || {}, null, 2))}</textarea>
        </div>
    `;
}

async function saveRateLimitConfig() {
    let perRoute;
    try {
        perRoute = JSON.parse(document.getElementById('rlPerRoute').value);
    } catch (e) {
        showToast('JSON格式错误: ' + e.message, 'error');
        return;
    }

    const config = {
        default: {
            enabled: document.getElementById('rlEnabled').checked,
            algorithm: document.getElementById('rlAlgorithm').value,
            capacity: parseInt(document.getElementById('rlCapacity').value),
            rate: parseFloat(document.getElementById('rlRate').value),
            per_route: perRoute
        }
    };

    showLoading();
    let result;
    try {
        result = await apiRequest('/rate-limit', 'PUT', config);
    } finally {
        hideLoading();
    }
    
    if (result) {
        showToast('限流配置保存成功，计数器已重置');
        loadRateLimitConfig();
        loadRateLimitStats();
    }
}

async function loadRateLimitStats() {
    const stats = await apiRequest('/rate-limit/stats');
    if (!stats) return;

    const container = document.getElementById('rateLimitStats');
    const routes = Object.keys(stats);
    
    if (routes.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;">暂无限流统计数据</p>';
        return;
    }

    let html = '<h3>限流统计 (实时)</h3><div class="stats-grid">';
    routes.forEach(route => {
        const ips = stats[route];
        Object.keys(ips).forEach(ip => {
            const data = ips[ip];
            html += `
                <div class="stat-card">
                    <h4>${escapeHtml(route)}</h4>
                    <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
                    <p><strong>算法:</strong> ${data.algorithm === 'token_bucket' ? '令牌桶' : '漏桶'}</p>
                    ${data.tokens !== undefined ? `<p><strong>剩余令牌:</strong> ${data.tokens.toFixed(2)}</p>` : ''}
                    ${data.queue_size !== undefined ? `<p><strong>队列大小:</strong> ${data.queue_size}</p>` : ''}
                </div>
            `;
        });
    });
    html += '</div>';
    container.innerHTML = html;
}

async function resetRateLimit() {
    if (!confirm('确定要重置所有限流计数器吗？')) return;
    
    showLoading();
    let result;
    try {
        result = await apiRequest('/rate-limit/reset', 'POST', {});
    } finally {
        hideLoading();
    }
    
    if (result) {
        showToast('限流计数器已重置');
        loadRateLimitStats();
    }
}

async function loadLogs() {
    const path = document.getElementById('logPath').value;
    const status = document.getElementById('logStatus').value;
    
    let url = '/logs?limit=100';
    if (path) url += '&path=' + encodeURIComponent(path);
    if (status) url += '&status_code=' + status;
    
    const logs = await apiRequest(url);
    if (!logs) return;

    const container = document.getElementById('logsList');
    if (logs.length === 0) {
        container.innerHTML = '<div class="log-entry">暂无日志数据</div>';
        return;
    }

    container.innerHTML = logs.map(log => {
        const time = new Date(log.timestamp).toLocaleString('zh-CN');
        const statusColor = log.status_code >= 500 ? '#ef4444' : log.status_code >= 400 ? '#f59e0b' : '#10b981';
        return `
            <div class="log-entry" onclick="showLogDetail(${JSON.stringify(log).replace(/"/g, '&quot;')})" style="cursor:pointer;">
[${time}] ${log.method} ${log.path} <span style="color:${statusColor}">${log.status_code}</span> ${log.duration_ms}ms
${log.rate_limited ? '⚠️ 触发限流 | ' : ''}${log.auth_method ? `🔐 ${log.auth_method}: ${log.auth_success ? '✓' : '✗'} | ` : ''}${log.mock_mode ? '🎭 Mock模式 | ' : ''}IP: ${log.client_ip}
${log.error ? `❌ 错误: ${log.error}` : ''}
            </div>
        `;
    }).join('');
}

function showLogDetail(log) {
    const detail = JSON.stringify(log, null, 2);
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>请求详情</h3>
            <pre style="background:#1a202c;color:#e2e8f0;padding:16px;border-radius:8px;overflow:auto;max-height:400px;font-size:12px;">${escapeHtml(detail)}</pre>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

async function loadGlobalConfig() {
    const config = await apiRequest('/config');
    if (!config) return;

    const global = config.global || {};
    const container = document.getElementById('globalConfig');
    
    container.innerHTML = `
        <div class="form-group">
            <label>服务端口 (需重启)</label>
            <input type="number" id="globalPort" value="${global.port || 5000}">
        </div>
        <div class="form-group">
            <label>绑定地址 (需重启)</label>
            <input type="text" id="globalHost" value="${escapeHtml(global.host || '0.0.0.0')}">
        </div>
        <div class="form-group">
            <label>日志级别</label>
            <select id="globalLogLevel">
                <option value="DEBUG" ${global.log_level === 'DEBUG' ? 'selected' : ''}>DEBUG</option>
                <option value="INFO" ${global.log_level === 'INFO' ? 'selected' : ''}>INFO</option>
                <option value="WARNING" ${global.log_level === 'WARNING' ? 'selected' : ''}>WARNING</option>
                <option value="ERROR" ${global.log_level === 'ERROR' ? 'selected' : ''}>ERROR</option>
            </select>
        </div>
        <div class="form-group">
            <label>日志目录</label>
            <input type="text" id="globalLogDir" value="${escapeHtml(global.log_dir || 'logs')}">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="globalAdminEnabled" ${global.admin_enabled !== false ? 'checked' : ''}> 启用管理界面 (需重启)
            </label>
        </div>
        <div class="form-group">
            <label>管理界面前缀 (需重启)</label>
            <input type="text" id="globalAdminPrefix" value="${escapeHtml(global.admin_prefix || '/_admin')}">
        </div>
        <div class="form-group">
            <label>热加载间隔(秒)</label>
            <input type="number" id="globalHotReload" value="${global.hot_reload_interval || 5}" min="1">
        </div>
    `;
}

async function saveGlobalConfig() {
    showLoading();
    const fullConfig = await apiRequest('/config');
    if (!fullConfig) {
        hideLoading();
        return;
    }

    fullConfig.global = {
        port: parseInt(document.getElementById('globalPort').value),
        host: document.getElementById('globalHost').value,
        log_level: document.getElementById('globalLogLevel').value,
        log_dir: document.getElementById('globalLogDir').value,
        admin_enabled: document.getElementById('globalAdminEnabled').checked,
        admin_prefix: document.getElementById('globalAdminPrefix').value,
        hot_reload_interval: parseInt(document.getElementById('globalHotReload').value)
    };

    let result;
    try {
        result = await apiRequest('/config', 'PUT', fullConfig);
    } finally {
        hideLoading();
    }
    
    if (result) {
        showToast('全局配置保存成功，端口/绑定地址/管理界面等配置需要重启服务生效');
        loadGlobalConfig();
    }
}

async function reloadConfig() {
    showLoading();
    let result;
    try {
        result = await apiRequest('/config/reload', 'POST');
    } finally {
        hideLoading();
    }
    
    if (result) {
        showToast(result.reloaded ? '配置已重新加载' : '配置无变化');
        loadAllData();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
};

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
