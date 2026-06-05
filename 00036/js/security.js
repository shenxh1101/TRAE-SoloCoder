let securityAlerts = [
    { id: 1, type: 'suspicious', title: '可疑物品检测', description: 'B区入口发现无人认领包裹', zone: 'B', time: '14:25:30', camera: 'B-01', status: 'active' },
    { id: 2, type: 'loitering', title: '人员滞留警告', description: 'C区3排有人滞留超过30分钟', zone: 'C', time: '14:20:15', camera: 'C-03', status: 'active' }
];

let securityEvents = [];
let currentCameraId = 'B-01';
let cameraList = [];

function initSecuritySystem() {
    renderSecurityAlerts();
    setupAlertListeners();
    initCameraDisplay();
    loadCameraList();
}

function loadCameraList() {
    API.cameraList().then(cameras => {
        if (cameras) {
            cameraList = cameras;
            updateCameraThumbnails();
        }
    });
}

function renderSecurityAlerts() {
    const container = document.getElementById('securityAlerts');
    if (!container) return;
    container.innerHTML = '';
    
    const activeAlerts = securityAlerts.filter(a => a.status === 'active');
    
    activeAlerts.forEach(alert => {
        const alertEl = createAlertElement(alert);
        container.appendChild(alertEl);
    });
}

function createAlertElement(alert) {
    const el = document.createElement('div');
    el.className = 'alert-item ' + (alert.type === 'suspicious' ? 'warning' : 'caution');
    el.dataset.alertId = alert.id;
    
    const icon = alert.type === 'suspicious' ? '⚠️' : '⏱️';
    
    el.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <div class="alert-content">
            <div class="alert-title">${alert.title}</div>
            <div class="alert-desc">${alert.description}</div>
            <div class="alert-time">${alert.time}</div>
        </div>
    `;
    
    el.addEventListener('click', () => {
        showCameraForAlert(alert);
    });
    
    return el;
}

function setupAlertListeners() {
    document.querySelectorAll('.alert-item').forEach(item => {
        item.addEventListener('click', () => {
            const alertId = parseInt(item.dataset.alertId);
            const alert = securityAlerts.find(a => a.id === alertId);
            if (alert) {
                showCameraForAlert(alert);
            }
        });
    });
    
    const cameraFeed = document.querySelector('.camera-feed');
    if (cameraFeed) {
        cameraFeed.addEventListener('click', () => {
            openCameraModal();
        });
    }
}

function initCameraDisplay() {
    updateCameraImages();
}

function updateCameraImages() {
    const smallView = document.querySelector('.camera-feed .camera-view');
    if (smallView) {
        smallView.innerHTML = `<img src="${API.cameraImage(currentCameraId)}" style="width:100%;height:100%;object-fit:cover;" alt="摄像头画面">`;
    }
    
    const largeView = document.querySelector('.camera-view.large');
    if (largeView && document.getElementById('cameraModal').style.display !== 'none') {
        largeView.innerHTML = `<img src="${API.cameraImage(currentCameraId)}" style="width:100%;height:100%;object-fit:cover;" alt="摄像头画面">`;
    }
    
    const cameraLabel = document.querySelector('.camera-feed .camera-label');
    if (cameraLabel) {
        cameraLabel.textContent = '摄像头 ' + currentCameraId;
    }
}

function showCameraForAlert(alert) {
    currentCameraId = alert.camera;
    const cameraFeed = document.querySelector('.camera-feed');
    if (cameraFeed) {
        cameraFeed.classList.add('active');
    }
    
    updateCameraImages();
    openCameraModal();
    
    selectCamera(document.querySelector('.camera-thumb'), alert.camera);
    
    showNotification('安保监控', '已调取 ' + alert.camera + ' 摄像头画面', 'warning');
}

function openCameraModal() {
    document.getElementById('cameraModal').style.display = 'flex';
    updateCameraImages();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function selectCamera(thumbEl, cameraId) {
    currentCameraId = cameraId;
    
    document.querySelectorAll('.camera-thumb').forEach(t => t.classList.remove('active'));
    if (thumbEl) {
        thumbEl.classList.add('active');
    }
    
    document.getElementById('modalCameraLabel').textContent = '摄像头 ' + cameraId;
    updateCameraImages();
    
    highlightSecurityZone(cameraId.split('-')[0]);
}

function updateCameraThumbnails() {
    const thumbsContainer = document.querySelector('.camera-thumbnails');
    if (!thumbsContainer || cameraList.length === 0) return;
    
    thumbsContainer.innerHTML = '';
    const displayedCameras = cameraList.slice(0, 4);
    
    displayedCameras.forEach((camera, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'camera-thumb' + (index === 0 ? ' active' : '');
        thumb.textContent = camera.id;
        thumb.onclick = () => selectCamera(thumb, camera.id);
        thumbsContainer.appendChild(thumb);
    });
}

function highlightSecurityZone(zone) {
    if (!securityGroup) return;
    
    securityGroup.traverse((child) => {
        if (child.userData && child.userData.type === 'alertZone') {
            if (child.userData.zone.includes(zone)) {
                child.material.emissive.setHex(0xff0000);
                child.material.color.setHex(0xff0000);
            }
        }
    });
}

function updateSecurityFromAPI(apiData) {
    const oldAlertsLength = securityAlerts.filter(a => a.status === 'active').length;
    securityAlerts = apiData.alerts;
    securityEvents = apiData.events;
    
    const newActiveAlerts = securityAlerts.filter(a => a.status === 'active');
    if (newActiveAlerts.length > oldAlertsLength) {
        const latestAlert = newActiveAlerts[0];
        showNotification('安保警报', latestAlert.title + ': ' + latestAlert.description, 'danger');
        flashAlertZone(latestAlert.zone);
    }
    
    renderSecurityAlerts();
    setupAlertListeners();
}

function flashAlertZone(zone) {
    if (!securityGroup) return;
    
    securityGroup.traverse((child) => {
        if (child.userData && child.userData.type === 'alertZone' && child.userData.zone.includes(zone)) {
            child.userData.flashing = true;
        }
    });
}

function addSecurityEvent(type, description, level) {
    securityEvents.unshift({
        time: new Date().toLocaleString('zh-CN'),
        type: type,
        description: description,
        level: level || '中'
    });
    securityEvents = securityEvents.slice(0, 100);
}

function getSecurityForExport() {
    const activeCount = securityAlerts.filter(a => a.status === 'active').length;
    const resolvedCount = securityAlerts.filter(a => a.status === 'resolved').length;
    
    return [
        {
            '统计项': '活跃警报',
            '数量': activeCount,
            '详情': securityAlerts.filter(a => a.status === 'active').map(a => a.title).join('; ')
        },
        {
            '统计项': '已处理警报',
            '数量': resolvedCount,
            '详情': '已处理完毕'
        },
        {
            '统计项': '安保事件总数',
            '数量': securityEvents.length,
            '详情': '见事件记录表'
        }
    ];
}

function getSecurityEventsForExport() {
    return securityEvents.map(event => ({
        '时间': event.time,
        '事件类型': event.type,
        '描述': event.description,
        '级别': event.level
    }));
}

function getSecurityAlertsForExport() {
    return securityAlerts.map(alert => ({
        '时间': alert.time,
        '类型': alert.type === 'suspicious' ? '可疑物品' : '人员滞留',
        '标题': alert.title,
        '描述': alert.description,
        '区域': alert.zone + '区',
        '关联摄像头': alert.camera,
        '状态': alert.status === 'active' ? '处理中' : '已解决'
    }));
}
