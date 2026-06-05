const API_BASE = 'http://localhost:3000/api';

let lastFormation = null;
let lastKeyMomentsLength = 0;

async function apiGet(endpoint) {
    try {
        const response = await fetch(API_BASE + endpoint);
        if (!response.ok) {
            throw new Error('API Error: ' + response.status);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', endpoint, error);
        return null;
    }
}

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('API Error: ' + response.status);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', endpoint, error);
        return null;
    }
}

const API = {
    health: () => apiGet('/health'),
    gamestate: () => apiGet('/gamestate'),
    attendance: () => apiGet('/attendance'),
    lawn: () => apiGet('/lawn'),
    players: () => apiGet('/players'),
    security: () => apiGet('/security/alerts'),
    energy: () => apiGet('/energy'),
    formation: () => apiGet('/formation'),
    maintenance: () => apiGet('/maintenance'),
    faceRecognize: (zone) => apiGet('/face/recognize?zone=' + (zone || 'A')),
    cameraList: () => apiGet('/camera/list'),
    cameraImage: (id) => API_BASE + '/camera/image?id=' + (id || 'B-01') + '&t=' + Date.now(),
    
    toggleSprinkler: () => apiPost('/sprinkler/toggle'),
    toggleLights: (manual) => apiPost('/lights/toggle', { manual: manual }),
    substitution: (tiredId, subId) => apiPost('/substitution', { tiredId, subId }),
    resolveAlert: (alertId) => apiPost('/alert/resolve', { alertId }),
    
    exportExcel: () => window.open(API_BASE + '/export', '_blank')
};

function checkFormationChange(newFormation) {
    if (lastFormation !== null && lastFormation !== newFormation.current) {
        showNotification('战术调整', '阵型已切换为: ' + newFormation.name, 'info');
        setFormation(newFormation.current);
    }
    lastFormation = newFormation.current;
}

function checkGameStateChange(gameState) {
    if (gameState.keyMoments && gameState.keyMoments.length > lastKeyMomentsLength) {
        const newMoment = gameState.keyMoments[gameState.keyMoments.length - 1];
        showNotification('比赛事件', newMoment.description, 'warning');
        lastKeyMomentsLength = gameState.keyMoments.length;
    }
}

async function pollAllData() {
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
}

function updateGameHeader(gamestate) {
    const header = document.querySelector('.match-status span:last-child');
    if (header) {
        header.textContent = '比赛进行中 - 第' + Math.floor(gamestate.matchTime) + '分钟';
    }
    
    document.title = gamestate.homeTeam + ' vs ' + gamestate.awayTeam + ' - 智慧体育场馆';
}

function startPolling() {
    pollAllData();
    
    setInterval(pollAllData, 2000);
    
    setInterval(updateCameraImages, 3000);
}
