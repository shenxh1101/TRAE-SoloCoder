document.addEventListener('DOMContentLoaded', () => {
    setupLogout();
    setupNavigation();
    loadDashboard();
    loadUserInfo();
    setupWebSocket();
});

let learningSocket;
let currentPlanId = null;
let heartbeatInterval = null;

function setupWebSocket() {
    learningSocket = io('/learning');
    
    learningSocket.on('connected', () => {
        console.log('学习WebSocket已连接');
    });
    
    learningSocket.on('status_update', (data) => {
        console.log('学习状态更新:', data);
    });
    
    learningSocket.on('certificate_issued', (data) => {
        showMessage(`🎉 恭喜！您获得了新证书: ${data.certificate.course_title}`, 'success');
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
        'dashboard': '我的主页',
        'available': '可选培训',
        'my-courses': '我的培训',
        'learning': '学习中',
        'exams': '我的考试',
        'certificates': '我的证书',
        'recommended': '推荐课程'
    };
    
    document.getElementById('pageTitle').textContent = titles[page] || '我的主页';
    
    const content = document.getElementById('pageContent');
    showLoading(content);
    
    stopHeartbeat();
    
    switch(page) {
        case 'dashboard': loadDashboard(); break;
        case 'available': loadAvailablePlans(); break;
        case 'my-courses': loadMyCourses(); break;
        case 'learning': loadLearning(); break;
        case 'exams': loadMyExams(); break;
        case 'certificates': loadMyCertificates(); break;
        case 'recommended': loadRecommended(); break;
    }
}

async function loadDashboard() {
    const response = await apiRequest('/employee/dashboard/stats');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        const data = response.data;
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-value">${data.enrollments_count}</div>
                    <div class="stat-label">培训报名</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-value">${data.certificates_count}</div>
                    <div class="stat-label">获得证书</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✍️</div>
                    <div class="stat-value">${data.exams_count}</div>
                    <div class="stat-label">参加考试</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${data.passed_exams}</div>
                    <div class="stat-label">考试通过</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-value">${data.total_study_hours}</div>
                    <div class="stat-label">总学习时长(小时)</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div class="data-table">
                    <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                        <h3>快捷操作</h3>
                    </div>
                    <div style="padding: 20px;">
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <button class="btn btn-primary" onclick="loadPageByName('available')">
                                📋 浏览可选培训
                            </button>
                            <button class="btn btn-secondary" onclick="loadPageByName('exams')">
                                ✍️ 参加考试
                            </button>
                            <button class="btn btn-success" onclick="loadPageByName('certificates')">
                                🏆 查看证书
                            </button>
                        </div>
                    </div>
                </div>
                <div class="data-table">
                    <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                        <h3>学习状态</h3>
                    </div>
                    <div style="padding: 20px;">
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>WebSocket连接</span>
                                <span class="badge badge-success">已连接</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>学习进度同步</span>
                                <span class="badge badge-info">实时</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function loadPageByName(page) {
    document.querySelector(`[data-page="${page}"]`).click();
}

async function loadAvailablePlans() {
    const response = await apiRequest('/employee/available-plans');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = '<div class="data-table"><table><thead><tr><th>课程名称</th><th>分类</th><th>难度</th><th>讲师</th><th>培训时间</th><th>报名/名额</th><th>操作</th></tr></thead><tbody>';
        
        response.data.forEach(plan => {
            const isFull = plan.enrolled_count >= plan.max_participants;
            html += `
                <tr>
                    <td>${plan.course_title}</td>
                    <td><span class="badge badge-info">${plan.course_category}</span></td>
                    <td>${plan.course_difficulty}</td>
                    <td>${plan.instructor}</td>
                    <td>${plan.start_time}<br>~ ${plan.end_time}</td>
                    <td>${plan.enrolled_count}/${plan.max_participants} ${isFull ? '<span class="badge badge-warning">已满</span>' : ''}</td>
                    <td>
                        <button class="btn btn-sm ${isFull ? 'btn-secondary' : 'btn-primary'}" onclick="enrollPlan(${plan.id})">
                            ${isFull ? '加入等待' : '立即报名'}
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        content.innerHTML = html;
    }
}

async function enrollPlan(planId) {
    const conflictResponse = await apiRequest('/api/enrollments/check-conflict', {
        method: 'POST',
        body: { plan_id: planId }
    });
    
    if (conflictResponse.success && conflictResponse.data.has_conflict) {
        const confirmMsg = `检测到时间冲突！是否继续报名（将加入等待队列）？\n冲突: ${conflictResponse.data.conflicts.map(c => c.course_title).join(', ')}`;
        if (!confirm(confirmMsg)) {
            return;
        }
    }
    
    const response = await apiRequest('/api/enrollments', {
        method: 'POST',
        body: { plan_id: planId }
    });
    
    if (response.success) {
        showMessage(response.message, 'success');
        loadAvailablePlans();
    } else {
        showMessage(response.message || '报名失败', 'error');
    }
}

async function loadMyCourses() {
    const response = await apiRequest('/employee/enrollments');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = '<div class="data-table"><table><thead><tr><th>计划编码</th><th>课程名称</th><th>讲师</th><th>培训时间</th><th>状态</th><th>操作</th></tr></thead><tbody>';
        
        response.data.forEach(enroll => {
            html += `
                <tr>
                    <td>${enroll.plan_code}</td>
                    <td>${enroll.course_title}</td>
                    <td>${enroll.course_instructor}</td>
                    <td>${enroll.start_time}<br>~ ${enroll.end_time}</td>
                    <td><span class="badge badge-info">${enroll.status}</span></td>
                    <td>
                        ${enroll.status === 'enrolled' ? `<button class="btn btn-sm btn-danger" onclick="cancelEnrollment(${enroll.id})">取消报名</button>` : ''}
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        content.innerHTML = html;
    }
}

async function cancelEnrollment(enrollmentId) {
    if (!confirm('确定要取消报名吗？')) return;
    
    const response = await apiRequest(`/api/enrollments/${enrollmentId}/cancel`, {
        method: 'POST'
    });
    
    if (response.success) {
        showMessage(response.message, 'success');
        loadMyCourses();
    } else {
        showMessage(response.message || '取消失败', 'error');
    }
}

async function loadLearning() {
    const enrollmentsResponse = await apiRequest('/employee/enrollments');
    const content = document.getElementById('pageContent');
    
    const activeEnrollments = enrollmentsResponse.data?.filter(e => e.status === 'enrolled') || [];
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h3>学习监控</h3>
            <p style="color: #718096;">选择正在进行的培训，实时同步学习进度</p>
        </div>
    `;
    
    if (activeEnrollments.length > 0) {
        html += `
            <div class="data-table" style="margin-bottom: 20px;">
                <table>
                    <thead>
                        <tr>
                            <th>课程名称</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        activeEnrollments.forEach(enroll => {
            html += `
                <tr>
                    <td>${enroll.course_title}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="startLearning(${enroll.id})">开始学习</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    html += `
        <div id="learningArea" style="display: none;">
            <div class="alert alert-info">
                <span>📖</span>
                <span id="learningStatus">正在学习中... 学习时长将自动同步</span>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-value" id="currentMinutes">0</div>
                    <div class="stat-label">本次学习(分钟)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📡</div>
                    <div class="stat-value" id="syncStatus">已连接</div>
                    <div class="stat-label">同步状态</div>
                </div>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                <button class="btn btn-danger" onclick="stopLearning()">结束学习</button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function startLearning(enrollmentId) {
    currentPlanId = enrollmentId;
    document.getElementById('learningArea').style.display = 'block';
    
    learningSocket.emit('join_plan', { plan_id: enrollmentId });
    
    let minutes = 0;
    heartbeatInterval = setInterval(() => {
        minutes += 1;
        document.getElementById('currentMinutes').textContent = minutes;
        
        learningSocket.emit('heartbeat', {
            employee_id: sessionStorage.getItem('userId'),
            plan_id: enrollmentId,
            study_minutes: 1
        });
    }, 60000);
    
    showMessage('已开始学习，学习时长将每分钟同步', 'success');
}

function stopLearning() {
    stopHeartbeat();
    
    if (currentPlanId) {
        learningSocket.emit('leave_plan', { plan_id: currentPlanId });
    }
    
    document.getElementById('learningArea').style.display = 'none';
    currentPlanId = null;
    
    showMessage('学习已结束', 'info');
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

async function loadMyExams() {
    const response = await apiRequest('/employee/exams');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = '<div class="data-table"><table><thead><tr><th>考试标题</th><th>课程名称</th><th>分数</th><th>及格线</th><th>状态</th><th>考试时间</th><th>操作</th></tr></thead><tbody>';
        
        response.data.forEach(exam => {
            const statusBadge = exam.is_passed ? 
                '<span class="badge badge-success">通过</span>' : 
                '<span class="badge badge-danger">未通过</span>';
            
            html += `
                <tr>
                    <td>${exam.exam_title}</td>
                    <td>${exam.course_title}</td>
                    <td>${exam.score}/${exam.total_score}</td>
                    <td>${exam.passing_score}</td>
                    <td>${statusBadge}</td>
                    <td>${exam.submit_time || '-'}</td>
                    <td>
                        ${!exam.is_passed ? `<button class="btn btn-sm btn-primary" onclick="takeExam(${exam.id})">补考</button>` : ''}
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        content.innerHTML = html;
    }
}

async function takeExam(examRecordId) {
    showMessage('考试功能开发中...', 'info');
}

async function loadMyCertificates() {
    const response = await apiRequest('/employee/certificates');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">';
        
        response.data.forEach(cert => {
            const statusBadge = cert.is_valid ? 
                '<span class="badge badge-success">有效</span>' : 
                '<span class="badge badge-danger">已失效</span>';
            
            html += `
                <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 3rem;">🏆</div>
                        <h3 style="margin: 10px 0;">${cert.course_title}</h3>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 0.9rem; color: #718096;">
                        <p style="margin: 5px 0;"><strong>证书编号:</strong> ${cert.certificate_code}</p>
                        <p style="margin: 5px 0;"><strong>颁发日期:</strong> ${cert.issue_date}</p>
                        <p style="margin: 5px 0;"><strong>有效期至:</strong> ${cert.expiry_date}</p>
                    </div>
                    <div style="margin-top: 15px; text-align: center;">
                        ${cert.certificate_url ? `<a class="btn btn-primary btn-sm" href="${cert.certificate_url}" target="_blank">下载证书</a>` : ''}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        if (response.data.length === 0) {
            html = '<div style="text-align: center; padding: 60px; color: #718096;"><div style="font-size: 4rem; margin-bottom: 20px;">📭</div><p>暂无证书，继续努力学习吧！</p></div>';
        }
        
        content.innerHTML = html;
    }
}

async function loadRecommended() {
    const response = await apiRequest('/employee/recommended-courses');
    const content = document.getElementById('pageContent');
    
    if (response.success) {
        const data = response.data;
        let html = `
            <div style="margin-bottom: 30px;">
                <h3>我的技能标签</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
        `;
        
        data.current_skills.forEach(skill => {
            html += `<span class="badge badge-info">${skill}</span>`;
        });
        
        html += `
                </div>
                <p style="margin-top: 15px; color: #718096;">
                    已完成 ${data.completed_courses_count} 门课程
                </p>
            </div>
            
            <h3 style="margin-bottom: 20px;">推荐进阶课程</h3>
        `;
        
        if (data.recommendations && data.recommendations.length > 0) {
            html += '<div class="data-table"><table><thead><tr><th>课程名称</th><th>分类</th><th>难度</th><th>匹配技能</th><th>操作</th></tr></thead><tbody>';
            
            data.recommendations.forEach(course => {
                html += `
                    <tr>
                        <td>${course.title}</td>
                        <td>${course.category}</td>
                        <td><span class="badge badge-warning">${course.difficulty_level}</span></td>
                        <td>${course.target_skills}</td>
                        <td>
                            <button class="btn btn-sm btn-primary">查看详情</button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
        } else {
            html += '<p style="color: #718096;">暂无推荐课程，请先完成更多基础课程</p>';
        }
        
        content.innerHTML = html;
    }
}
