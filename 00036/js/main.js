let lightsManualOverride = false;
let sprinklerManualOverride = false;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initAllSystems();
    }, 500);
});

function initAllSystems() {
    updateTime();
    setInterval(updateTime, 1000);
    
    initPlayerMonitoring();
    initLawnMonitoring();
    initSecuritySystem();
    initTacticalScreen();
    
    updateAttendanceDisplay();
    updateEnergyDisplay();
    
    setupControlButtons();
    setupModalEvents();
    
    API.health().then(result => {
        if (result) {
            showNotification('后端连接成功', 'API服务已连接，开始数据同步', 'success');
            startPolling();
        } else {
            showNotification('连接警告', '无法连接到后端服务，请检查服务器状态', 'warning');
        }
    });
    
    addMaintenanceLog('系统启动', '场馆运营管理平台已启动');
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
        timeEl.textContent = timeStr;
    }
}

function setupControlButtons() {
    const exportBtn = document.getElementById('btnExport');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportOperationReport);
    }
    
    const lightsBtn = document.getElementById('btnToggleLights');
    if (lightsBtn) {
        lightsBtn.addEventListener('click', function() {
            toggleAllLights();
        });
    }
    
    const sprinklerBtn = document.getElementById('btnToggleSprinkler');
    if (sprinklerBtn) {
        sprinklerBtn.addEventListener('click', function() {
            toggleSprinklerManual();
        });
    }
    
    const simulateBtn = document.getElementById('btnSimulate');
    if (simulateBtn) {
        simulateBtn.addEventListener('click', function() {
            pollAllData();
            showNotification('数据刷新', '已从服务器刷新最新数据', 'info');
        });
    }
}

function setupModalEvents() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

window.confirmSubstitution = confirmSubstitution;
window.selectCamera = selectCamera;
window.openCameraModal = openCameraModal;

let lastFaceRecognition = {};

async function pollAllData() {
    try {
        const results = await Promise.all([
            API.attendance(),
            API.lawn(),
            API.players(),
            API.security(),
            API.energy(),
            API.formation(),
            API.gamestate()
        ]);
        
        const [attendance, lawn, players, security, energy, formation, gamestate] = results;
        
        if (attendance) {
            updateAttendanceFromAPI(attendance);
        }
        
        if (lawn) {
            updateLawnFromAPI(lawn);
        }
        
        if (players) {
            updatePlayersFromAPI(players);
        }
        
        if (security) {
            updateSecurityFromAPI(security);
        }
        
        if (energy) {
            updateEnergyFromAPI(energy);
        }
        
        if (formation) {
            checkFormationChange(formation);
        }
        
        if (gamestate) {
            checkGameStateChange(gamestate);
            updateGameHeader(gamestate);
        }
    } catch (error) {
        console.error('Polling error:', error);
    }
}

function checkFormationChange(newFormation) {
    if (!lastFormation) {
        lastFormation = newFormation.current;
        setFormation(newFormation.current);
        return;
    }
    
    if (lastFormation !== newFormation.current) {
        showNotification('战术调整', '阵型已切换为: ' + newFormation.name, 'info');
        setFormation(newFormation.current);
        lastFormation = newFormation.current;
    }
}

function checkGameStateChange(gameState) {
    if (!lastKeyMomentsLength) {
        lastKeyMomentsLength = gameState.keyMoments ? gameState.keyMoments.length : 0;
        return;
    }
    
    if (gameState.keyMoments && gameState.keyMoments.length > lastKeyMomentsLength) {
        const newMoment = gameState.keyMoments[gameState.keyMoments.length - 1];
        showNotification('比赛事件', newMoment.description, 'warning');
        lastKeyMomentsLength = gameState.keyMoments.length;
        
        if (newMoment.type === 'tactical') {
            API.formation().then(f => {
                if (f) {
                    checkFormationChange(f);
                }
            });
        }
    }
}

function updateGameHeader(gamestate) {
    const header = document.querySelector('.match-status span:last-child');
    if (header && gamestate) {
        header.textContent = '比赛进行中 - 第' + Math.floor(gamestate.matchTime) + '分钟';
    }
    
    if (gamestate && gamestate.homeTeam && gamestate.awayTeam) {
        document.title = gamestate.homeTeam + ' vs ' + gamestate.awayTeam + ' - 智慧体育场馆';
    }
}

function startPolling() {
    pollAllData();
    setInterval(pollAllData, 2000);
    setInterval(updateCameraImages, 3000);
}
