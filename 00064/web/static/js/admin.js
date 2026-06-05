document.addEventListener('DOMContentLoaded', () => {
    setupLogout();
    setupNavigation();
    loadDashboard();
    loadUserInfo();
    setupWebSocket();
});

let adminSocket;

function setupWebSocket() {
    adminSocket = io('/admin');
    
    adminSocket.on('connected', () => {
        console.log('管理员WebSocket已连接');
    });
    
    adminSocket.on('warning', (data) => {
        showMessage(`⚠️ 预警: ${data.employee_name} 学习不积极，已预警${data.warning_count}次`, 'warning');
    });
}

async function loadUserInfo() {
    const response = await apiRequest('/auth/current');
    if (response.success) {
        document.getElementById('userName').textContent = response.user.name;
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            loadPage(page);
        });
    });
}

function loadPage(page) {
    const titles = {
        'dashboard': '数据概览',
        'courses': '课程管理',
        'plans': '培训计划',
        'monitoring': '学习监控',
        'exams': '考试管理',
        'certificates': '证书管理',
        'reports': '报告中心',
        'query': '数据查询',
        'logs': '操作日志'
    };
    
    document.getElementById('pageTitle').textContent = titles[page] || '数据概览';
    
    const content = document.getElementById('pageContent');
    showLoading(content);
    
    switch(page) {
        case 'dashboard': loadDashboard(); break;
        case 'courses': loadCourses(); break;
        case 'plans': loadPlans(); break;
        case 'monitoring': loadMonitoring(); break;
        case 'exams': loadExams(); break;
        case 'certificates': loadCertificates(); break;
        case 'reports': loadReports(); break;
        case 'query': loadQuery(); break;
        case 'logs': loadLogs(); break;
    }
}

async function loadDashboard() {
    const response = await apiRequest('/admin/dashboard/stats');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        const data = response.data;
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-value">${data.total_employees}</div>
                    <div class="stat-label">员工总数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📚</div>
                    <div class="stat-value">${data.total_courses}</div>
                    <div class="stat-label">课程总数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-value">${data.total_plans}</div>
                    <div class="stat-label">培训计划</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">▶️</div>
                    <div class="stat-value">${data.active_plans}</div>
                    <div class="stat-label">进行中</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✍️</div>
                    <div class="stat-value">${data.total_exams}</div>
                    <div class="stat-label">考试次数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-value">${data.total_certificates}</div>
                    <div class="stat-label">证书颁发</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-value">${data.total_enrollments}</div>
                    <div class="stat-label">报名人次</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div class="data-table">
                    <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                        <h3>快捷操作</h3>
                    </div>
                    <div style="padding: 20px;">
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <button class="btn btn-primary" onclick="showUploadModal()">
                                📤 上传课件
                            </button>
                            <button class="btn btn-secondary" onclick="generateMonthlyReport()">
                                📊 生成月度报告
                            </button>
                            <button class="btn btn-success" onclick="autoIssueCertificates()">
                                🏆 批量颁发证书
                            </button>
                        </div>
                    </div>
                </div>
                <div class="data-table">
                    <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                        <h3>系统状态</h3>
                    </div>
                    <div style="padding: 20px;">
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>定时任务调度器</span>
                                <span class="badge badge-success">运行中</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>WebSocket服务</span>
                                <span class="badge badge-success">已连接</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>数据同步</span>
                                <span class="badge badge-info">实时</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

async function loadCourses() {
    const response = await apiRequest('/api/courses');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = `
            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" onclick="showUploadModal()">
                    📤 上传新课件
                </button>
            </div>
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>课程编码</th>
                            <th>课程名称</th>
                            <th>分类</th>
                            <th>难度</th>
                            <th>讲师</th>
                            <th>题目数</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        response.data.forEach(course => {
            html += `
                <tr>
                    <td>${course.course_code}</td>
                    <td>${course.title}</td>
                    <td>${course.category}</td>
                    <td><span class="badge badge-info">${course.difficulty_level}</span></td>
                    <td>${course.instructor}</td>
                    <td>${course.question_count}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="createPlan(${course.id})">创建计划</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            
            <div class="modal" id="uploadModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>上传课件</h3>
                        <button class="modal-close" onclick="closeModal('uploadModal')">&times;</button>
                    </div>
                    <form id="uploadForm">
                        <div class="file-upload-area" onclick="document.getElementById('courseFile').click()">
                            <div class="upload-icon">📁</div>
                            <p>点击选择或拖拽文件到此处</p>
                            <p style="font-size: 0.85rem; color: #718096;">支持 PDF、DOCX、TXT、MD 格式</p>
                            <input type="file" id="courseFile" name="file" accept=".pdf,.docx,.txt,.md" onchange="updateFileName(this)">
                            <p id="fileName" style="margin-top: 10px; color: #667eea;"></p>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>课程名称</label>
                                <input type="text" name="title" required>
                            </div>
                            <div class="form-group">
                                <label>课程分类</label>
                                <select name="category">
                                    <option value="技术培训">技术培训</option>
                                    <option value="管理培训">管理培训</option>
                                    <option value="通用培训">通用培训</option>
                                    <option value="产品培训">产品培训</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>难度等级</label>
                                <select name="difficulty">
                                    <option value="初级">初级</option>
                                    <option value="中级" selected>中级</option>
                                    <option value="高级">高级</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>讲师</label>
                                <input type="text" name="instructor" value="系统讲师">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">上传并解析</button>
                    </form>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
        document.getElementById('uploadForm').addEventListener('submit', uploadCourse);
    }
}

function updateFileName(input) {
    const fileName = input.files[0]?.name || '';
    document.getElementById('fileName').textContent = fileName ? `已选择: ${fileName}` : '';
}

async function uploadCourse(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/courses/upload', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`课件上传成功！已自动生成${data.data.keywords_count}个关键词`, 'success');
            closeModal('uploadModal');
            loadCourses();
        } else {
            showMessage(data.message || '上传失败', 'error');
        }
    } catch (error) {
        showMessage('上传失败: ' + error.message, 'error');
    }
}

async function createPlan(courseId) {
    const response = await apiRequest('/api/training-plans', {
        method: 'POST',
        body: { course_id: courseId }
    });
    
    if (response.success) {
        showMessage(`培训计划创建成功！已匹配${response.data.recommended_count}名推荐员工`, 'success');
        loadPlans();
    } else {
        showMessage(response.message || '创建失败', 'error');
    }
}

async function loadPlans() {
    const response = await apiRequest('/api/training-plans');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = `
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>计划编码</th>
                            <th>课程名称</th>
                            <th>培训时间</th>
                            <th>报名/名额</th>
                            <th>状态</th>
                            <th>监控状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        response.data.forEach(plan => {
            const statusBadge = plan.status === 'active' ? 
                '<span class="badge badge-success">进行中</span>' : 
                '<span class="badge badge-secondary">已结束</span>';
            const monitorBadge = plan.monitoring_status === 'monitoring' ?
                '<span class="badge badge-info">监控中</span>' :
                '<span class="badge badge-secondary">未监控</span>';
            
            html += `
                <tr>
                    <td>${plan.plan_code}</td>
                    <td>${plan.course_title}</td>
                    <td>${plan.start_time}<br>~ ${plan.end_time}</td>
                    <td>${plan.enrolled_count}/${plan.max_participants}</td>
                    <td>${statusBadge}</td>
                    <td>${monitorBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="viewMatches(${plan.id})">匹配员工</button>
                        <button class="btn btn-sm btn-primary" onclick="startMonitoring(${plan.id})">启动监控</button>
                        <button class="btn btn-sm btn-secondary" onclick="generateExam(${plan.id})">生成考试</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        content.innerHTML = html;
    }
}

async function viewMatches(planId) {
    const response = await apiRequest(`/api/training-plans/${planId}/match`);
    
    if (response.success) {
        let html = '<div style="padding: 20px;"><h3>推荐员工列表</h3><table class="data-table"><thead><tr><th>员工</th><th>部门</th><th>匹配度</th><th>推荐等级</th><th>操作</th></tr></thead><tbody>';
        
        response.data.slice(0, 10).forEach(emp => {
            html += `
                <tr>
                    <td>${emp.employee_name}</td>
                    <td>${emp.department}</td>
                    <td>${(emp.match_score * 100).toFixed(0)}%</td>
                    <td><span class="badge badge-${emp.recommend_level === '高' ? 'success' : emp.recommend_level === '中' ? 'warning' : 'info'}">${emp.recommend_level}</span></td>
                    <td><button class="btn btn-sm btn-primary" onclick="enrollEmployee(${planId}, ${emp.employee_id})">报名</button></td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        document.getElementById('pageContent').innerHTML = html;
    }
}

async function enrollEmployee(planId, employeeId) {
    const response = await apiRequest('/api/enrollments', {
        method: 'POST',
        body: { plan_id: planId, employee_id: employeeId }
    });
    
    if (response.success) {
        showMessage('报名成功！', 'success');
        viewMatches(planId);
    } else {
        showMessage(response.message || '报名失败', 'error');
    }
}

async function startMonitoring(planId) {
    const response = await apiRequest('/api/learning/monitor/start', {
        method: 'POST',
        body: { plan_id: planId }
    });
    
    if (response.success) {
        showMessage('培训监控已启动！', 'success');
        loadPlans();
    } else {
        showMessage(response.message || '启动失败', 'error');
    }
}

async function generateExam(planId) {
    const response = await apiRequest('/api/exams/generate', {
        method: 'POST',
        body: { training_plan_id: planId }
    });
    
    if (response.success) {
        showMessage(`考试生成成功！共${response.data.question_count}道题`, 'success');
        loadExams();
    } else {
        showMessage(response.message || '生成失败', 'error');
    }
}

async function loadMonitoring() {
    const plansResponse = await apiRequest('/api/training-plans');
    const content = document.getElementById('pageContent');
    
    const activePlans = plansResponse.data?.filter(p => p.monitoring_status === 'monitoring') || [];
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h3>实时学习监控</h3>
            <p style="color: #718096;">WebSocket实时推送学习数据，每30分钟自动采集</p>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📡</div>
                <div class="stat-value">${activePlans.length}</div>
                <div class="stat-label">监控中计划</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-value" id="totalLearning">0</div>
                <div class="stat-label">学习中人数</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚠️</div>
                <div class="stat-value" id="inactiveCount">0</div>
                <div class="stat-label">不积极学员</div>
            </div>
        </div>
    `;
    
    if (activePlans.length > 0) {
        html += `
            <div style="margin-top: 20px;">
                <h4>正在监控的培训计划</h4>
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>计划编码</th>
                                <th>课程名称</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        activePlans.forEach(plan => {
            html += `
                <tr>
                    <td>${plan.plan_code}</td>
                    <td>${plan.course_title}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="viewMonitoringDetail(${plan.id})">查看详情</button>
                        <button class="btn btn-sm btn-danger" onclick="stopMonitoring(${plan.id})">停止监控</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

async function stopMonitoring(planId) {
    const response = await apiRequest('/api/learning/monitor/stop', {
        method: 'POST',
        body: { plan_id: planId }
    });
    
    if (response.success) {
        showMessage('监控已停止', 'success');
        loadMonitoring();
    } else {
        showMessage(response.message || '停止失败', 'error');
    }
}

async function loadExams() {
    const response = await apiRequest('/api/exams');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = `
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>考试编码</th>
                            <th>考试标题</th>
                            <th>题目数</th>
                            <th>总分</th>
                            <th>及格线</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        response.data.forEach(exam => {
            html += `
                <tr>
                    <td>${exam.exam_code}</td>
                    <td>${exam.title}</td>
                    <td>${exam.question_count}</td>
                    <td>${exam.total_score}</td>
                    <td>${exam.passing_score}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="viewExamStats(${exam.id})">查看统计</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        content.innerHTML = html;
    }
}

async function viewExamStats(examId) {
    const response = await apiRequest(`/api/exams/${examId}/statistics`);
    
    if (response.success) {
        const stats = response.data;
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-value">${stats.total_participants}</div>
                    <div class="stat-label">总参与人数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${stats.passed_count}</div>
                    <div class="stat-label">通过人数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">❌</div>
                    <div class="stat-value">${stats.failed_count}</div>
                    <div class="stat-label">未通过人数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-value">${stats.pass_rate}%</div>
                    <div class="stat-label">通过率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">${stats.average_score}</div>
                    <div class="stat-label">平均分</div>
                </div>
            </div>
            <div class="data-table" style="margin-top: 20px;">
                <div style="padding: 20px;">
                    <h3>分数分布</h3>
                    <pre>${JSON.stringify(stats.score_distribution, null, 2)}</pre>
                </div>
            </div>
            <button class="btn btn-secondary" style="margin-top: 20px;" onclick="loadExams()">返回列表</button>
        `;
    }
}

async function loadCertificates() {
    const response = await apiRequest('/api/certificates');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = `
            <div style="margin-bottom: 20px;">
                <button class="btn btn-success" onclick="autoIssueCertificates()">批量颁发证书</button>
            </div>
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>证书编号</th>
                            <th>员工姓名</th>
                            <th>课程名称</th>
                            <th>颁发日期</th>
                            <th>有效期至</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        response.data.forEach(cert => {
            const statusBadge = cert.is_valid ? 
                '<span class="badge badge-success">有效</span>' : 
                '<span class="badge badge-danger">已失效</span>';
            
            html += `
                <tr>
                    <td>${cert.certificate_code}</td>
                    <td>${cert.employee_name}</td>
                    <td>${cert.course_title}</td>
                    <td>${cert.issue_date}</td>
                    <td>${cert.expiry_date}</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${cert.certificate_url ? `<a class="btn btn-sm btn-primary" href="${cert.certificate_url}" target="_blank">下载</a>` : ''}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        content.innerHTML = html;
    }
}

async function autoIssueCertificates() {
    const response = await apiRequest('/api/certificates/auto-issue', {
        method: 'POST'
    });
    
    if (response.success) {
        const successCount = response.data.filter(r => r.success).length;
        showMessage(`证书颁发完成：成功 ${successCount}/${response.data.length}`, 'success');
        loadCertificates();
    }
}

async function loadReports() {
    const response = await apiRequest('/admin/reports');
    const content = document.getElementById('pageContent');
    
    let html = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-primary" onclick="generateMonthlyReport()">
                📊 生成月度报告
            </button>
        </div>
        <div class="data-table">
            <table>
                <thead>
                    <tr>
                        <th>报告编码</th>
                        <th>类型</th>
                        <th>统计周期</th>
                        <th>完成率</th>
                        <th>平均分</th>
                        <th>参与率</th>
                        <th>生成时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (response.success && response.data) {
        response.data.forEach(report => {
            html += `
                <tr>
                    <td>${report.report_code}</td>
                    <td><span class="badge badge-info">${report.report_type}</span></td>
                    <td>${report.start_date} ~ ${report.end_date}</td>
                    <td>${report.completion_rate}%</td>
                    <td>${report.average_score}分</td>
                    <td>${report.participation_rate}%</td>
                    <td>${report.created_at}</td>
                    <td>
                        ${report.pdf_path ? `<a class="btn btn-sm btn-primary" href="${report.pdf_path}" target="_blank">PDF</a>` : ''}
                        ${report.excel_path ? `<a class="btn btn-sm btn-success" href="${report.excel_path}" target="_blank">Excel</a>` : ''}
                    </td>
                </tr>
            `;
        });
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    content.innerHTML = html;
}

async function generateMonthlyReport() {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    if (month === 0) {
        month = 12;
        year--;
    }
    
    const response = await apiRequest('/admin/reports/monthly', {
        method: 'POST',
        body: { year, month }
    });
    
    if (response.success) {
        showMessage('月度报告生成成功！', 'success');
        loadReports();
    } else {
        showMessage(response.message || '生成失败', 'error');
    }
}

function loadQuery() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="query-form">
            <h3 style="margin-bottom: 20px;">数据查询 - 培训记录</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>课程名称</label>
                    <input type="text" id="q_course_name" placeholder="输入课程名称">
                </div>
                <div class="form-group">
                    <label>讲师</label>
                    <input type="text" id="q_instructor" placeholder="输入讲师姓名">
                </div>
                <div class="form-group">
                    <label>部门</label>
                    <input type="text" id="q_department" placeholder="输入部门名称">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>开始日期</label>
                    <input type="date" id="q_start_date">
                </div>
                <div class="form-group">
                    <label>结束日期</label>
                    <input type="date" id="q_end_date">
                </div>
            </div>
            <div class="query-actions">
                <button class="btn btn-primary" onclick="queryTraining()">查询培训记录</button>
                <button class="btn btn-success" onclick="exportTraining()">导出Excel</button>
            </div>
        </div>
        
        <div id="queryResults"></div>
    `;
}

async function queryTraining() {
    const params = {
        course_name: document.getElementById('q_course_name').value,
        instructor: document.getElementById('q_instructor').value,
        department: document.getElementById('q_department').value,
        start_date: document.getElementById('q_start_date').value,
        end_date: document.getElementById('q_end_date').value
    };
    
    const queryString = new URLSearchParams(params).toString();
    const response = await apiRequest(`/admin/query/training?${queryString}`);
    
    const resultsDiv = document.getElementById('queryResults');
    if (response.success) {
        let html = `
            <p style="margin-bottom: 10px;">共找到 ${response.count} 条记录</p>
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>员工</th>
                            <th>部门</th>
                            <th>课程</th>
                            <th>培训时间</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        response.data.slice(0, 50).forEach(record => {
            html += `
                <tr>
                    <td>${record.employee_name || '-'}</td>
                    <td>${record.department || '-'}</td>
                    <td>${record.course_title || '-'}</td>
                    <td>${record.plan_date || '-'}</td>
                    <td><span class="badge badge-info">${record.status || '-'}</span></td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        resultsDiv.innerHTML = html;
    }
}

async function exportTraining() {
    const params = {
        course_name: document.getElementById('q_course_name').value,
        instructor: document.getElementById('q_instructor').value,
        department: document.getElementById('q_department').value,
        start_date: document.getElementById('q_start_date').value,
        end_date: document.getElementById('q_end_date').value
    };
    
    const response = await apiRequest('/admin/export/training', {
        method: 'POST',
        body: params
    });
    
    if (response.success) {
        window.open(response.data.download_url, '_blank');
        showMessage('导出成功！', 'success');
    } else {
        showMessage(response.message || '导出失败', 'error');
    }
}

async function loadLogs() {
    const response = await apiRequest('/admin/query/logs');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = `
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>操作人</th>
                            <th>操作类型</th>
                            <th>目标类型</th>
                            <th>详情</th>
                            <th>时间</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        response.data.slice(0, 100).forEach(log => {
            html += `
                <tr>
                    <td>${log.operator}</td>
                    <td>${log.operation}</td>
                    <td>${log.target_type || '-'}</td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${log.details || '-'}</td>
                    <td>${log.created_at || '-'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        content.innerHTML = html;
    }
}

function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function viewMonitoringDetail(planId) {
    showMessage(`正在加载培训计划 ${planId} 的监控详情...`, 'info');
}
