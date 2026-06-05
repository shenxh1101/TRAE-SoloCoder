let lawnData = {
    temperature: 29.5,
    humidity: 62,
    light: 8500,
    ph: 6.8,
    sprinklerActive: true,
    sprinklerManual: false
};

let waterParticles = [];
let maintenanceLogs = [];

function initLawnMonitoring() {
    updateLawnDisplay();
    if (lawnData.sprinklerActive) {
        startWaterParticles();
    }
}

function updateLawnDisplay() {
    document.getElementById('lawnTemp').textContent = lawnData.temperature.toFixed(1) + '°C';
    document.getElementById('lawnHumidity').textContent = lawnData.humidity.toFixed(0) + '%';
    document.getElementById('lawnLight').textContent = lawnData.light.toFixed(0) + ' lux';
    document.getElementById('lawnPH').textContent = lawnData.ph.toFixed(1);
    
    const tempEl = document.getElementById('lawnTemp');
    if (lawnData.temperature > 28) {
        tempEl.style.color = '#ff4444';
    } else if (lawnData.temperature > 25) {
        tempEl.style.color = '#ffaa00';
    } else {
        tempEl.style.color = '#00ff88';
    }
    
    const statusEl = document.getElementById('sprinklerStatus');
    if (lawnData.sprinklerActive) {
        statusEl.innerHTML = '<span class="sprinkler-icon">💦</span><span>喷灌系统运行中</span>';
        statusEl.style.borderColor = 'rgba(0, 212, 255, 0.5)';
        statusEl.style.background = 'rgba(0, 212, 255, 0.15)';
    } else {
        statusEl.innerHTML = '<span class="sprinkler-icon">⏸️</span><span>喷灌系统已关闭</span>';
        statusEl.style.borderColor = 'rgba(139, 163, 199, 0.3)';
        statusEl.style.background = 'rgba(42, 63, 95, 0.3)';
    }
}

function updateLawnFromAPI(apiData) {
    const oldData = JSON.parse(JSON.stringify(lawnData));
    lawnData = apiData;
    
    if (oldData.sprinklerActive !== lawnData.sprinklerActive) {
        if (lawnData.sprinklerActive) {
            startWaterParticles();
            if (!lawnData.sprinklerManual) {
                showNotification('喷灌系统启动', '草坪温度' + lawnData.temperature.toFixed(1) + '°C，已启动自动喷灌', 'info');
            }
        } else {
            stopWaterParticles();
            if (!lawnData.sprinklerManual) {
                showNotification('喷灌系统关闭', '草坪温度已恢复正常', 'info');
            }
        }
    }
    
    updateLawnDisplay();
}

function toggleSprinklerManual() {
    API.toggleSprinkler().then(result => {
        if (result) {
            lawnData.sprinklerManual = result.manual;
            lawnData.sprinklerActive = result.active;
            
            if (result.active) {
                startWaterParticles();
            } else {
                stopWaterParticles();
            }
            
            updateLawnDisplay();
            
            const btn = document.getElementById('btnToggleSprinkler');
            if (btn) {
                btn.innerHTML = result.manual ? 
                    '<span class="icon">🚿</span>恢复自动喷灌' : 
                    '<span class="icon">🚿</span>手动控制喷灌';
            }
            
            showNotification('手动控制', result.manual ? '已切换至手动喷灌控制模式' : '已切换至自动喷灌控制模式', 'info');
        }
    });
    
    return lawnData.sprinklerManual;
}

function startWaterParticles() {
    if (!stadiumGroup) return;
    
    const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.7
    });
    
    const sprinklerPositions = [
        [-15, 5.5, -15], [15, 5.5, -15],
        [-15, 5.5, 15], [15, 5.5, 15],
        [0, 5.5, -20], [0, 5.5, 20]
    ];
    
    stopWaterParticles();
    
    sprinklerPositions.forEach((pos, si) => {
        for (let i = 0; i < 20; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
            particle.position.set(pos[0], pos[1], pos[2]);
            particle.userData = {
                type: 'waterParticle',
                sprinklerIndex: si,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3,
                    Math.random() * 0.3 + 0.1,
                    (Math.random() - 0.5) * 0.3
                ),
                life: 1.0,
                basePos: [...pos]
            };
            waterParticles.push(particle);
            stadiumGroup.add(particle);
        }
    });
    
    animateWaterParticles();
}

function stopWaterParticles() {
    waterParticles.forEach(p => {
        if (stadiumGroup) stadiumGroup.remove(p);
    });
    waterParticles = [];
}

function animateWaterParticles() {
    if (waterParticles.length === 0 || !lawnData.sprinklerActive) return;
    
    waterParticles.forEach(p => {
        p.position.add(p.userData.velocity);
        p.userData.velocity.y -= 0.01;
        p.userData.life -= 0.02;
        
        p.material.opacity = p.userData.life * 0.7;
        
        if (p.userData.life <= 0 || p.position.y < 5.1) {
            p.position.set(
                p.userData.basePos[0] + (Math.random() - 0.5) * 2,
                p.userData.basePos[1],
                p.userData.basePos[2] + (Math.random() - 0.5) * 2
            );
            p.userData.velocity.set(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.3
            );
            p.userData.life = 1.0;
        }
    });
    
    if (lawnData.sprinklerActive) {
        requestAnimationFrame(animateWaterParticles);
    }
}

function addMaintenanceLog(action, detail) {
    const log = {
        time: new Date().toLocaleString('zh-CN'),
        action: action,
        detail: detail,
        temperature: lawnData.temperature.toFixed(1),
        humidity: lawnData.humidity.toFixed(0),
        ph: lawnData.ph.toFixed(1)
    };
    maintenanceLogs.unshift(log);
    if (maintenanceLogs.length > 100) maintenanceLogs.pop();
}

function getLawnForExport() {
    return [
        {
            '监测项目': '温度',
            '当前值': lawnData.temperature.toFixed(1) + '°C',
            '阈值': '>28°C启动喷灌',
            '状态': lawnData.temperature > 28 ? '超标' : '正常'
        },
        {
            '监测项目': '湿度',
            '当前值': lawnData.humidity.toFixed(0) + '%',
            '阈值': '40%-80%',
            '状态': lawnData.humidity >= 40 && lawnData.humidity <= 80 ? '正常' : '异常'
        },
        {
            '监测项目': '光照',
            '当前值': lawnData.light.toFixed(0) + ' lux',
            '阈值': '5000-12000 lux',
            '状态': '正常'
        },
        {
            '监测项目': 'pH值',
            '当前值': lawnData.ph.toFixed(1),
            '阈值': '6.0-7.0',
            '状态': lawnData.ph >= 6.0 && lawnData.ph <= 7.0 ? '正常' : '异常'
        }
    ];
}

function getMaintenanceLogsForExport() {
    return maintenanceLogs.map(log => ({
        '时间': log.time,
        '操作': log.action,
        '详情': log.detail,
        '温度(°C)': log.temperature,
        '湿度(%)': log.humidity,
        'pH值': log.ph
    }));
}
