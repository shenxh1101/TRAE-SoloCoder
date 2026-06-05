let players = [
    { id: 1, number: 1, name: '特尔施特根', position: '门将', stamina: 95, status: '场上', heatmap: [] },
    { id: 2, number: 4, name: '阿劳霍', position: '后卫', stamina: 72, status: '场上', heatmap: [] },
    { id: 3, number: 3, name: '皮克', position: '后卫', stamina: 65, status: '场上', heatmap: [] },
    { id: 4, number: 18, name: '阿尔巴', position: '后卫', stamina: 58, status: '场上', heatmap: [] },
    { id: 5, number: 22, name: '明格萨', position: '后卫', stamina: 70, status: '场上', heatmap: [] },
    { id: 6, number: 5, name: '布斯克茨', position: '中场', stamina: 55, status: '场上', heatmap: [] },
    { id: 7, number: 21, name: '德容', position: '中场', stamina: 68, status: '场上', heatmap: [] },
    { id: 8, number: 16, name: '佩德里', position: '中场', stamina: 75, status: '场上', heatmap: [] },
    { id: 9, number: 10, name: '梅西', position: '前锋', stamina: 45, status: '场上', heatmap: [] },
    { id: 10, number: 9, name: '苏亚雷斯', position: '前锋', stamina: 52, status: '场上', heatmap: [] },
    { id: 11, number: 11, name: '登贝莱', position: '前锋', stamina: 98, status: '替补', heatmap: [] },
    { id: 12, number: 7, name: '格列兹曼', position: '前锋', stamina: 92, status: '替补', heatmap: [] },
    { id: 13, number: 12, name: '普吉', position: '中场', stamina: 96, status: '替补', heatmap: [] },
    { id: 14, number: 13, name: '内托', position: '门将', stamina: 100, status: '替补', heatmap: [] }
];

let staminaHistory = {};
let substitutionSuggested = {};

function initPlayerMonitoring() {
    players.forEach(p => {
        staminaHistory[p.id] = [p.stamina];
        substitutionSuggested[p.id] = false;
    });
    renderPlayerList();
    updateLockerDisplays();
}

function renderPlayerList() {
    const container = document.getElementById('playerList');
    if (!container) return;
    container.innerHTML = '';
    
    const onFieldPlayers = players.filter(p => p.status === '场上');
    const subPlayers = players.filter(p => p.status === '替补');
    
    onFieldPlayers.forEach(player => {
        const item = createPlayerItem(player);
        container.appendChild(item);
    });
    
    const divider = document.createElement('div');
    divider.style.cssText = 'height: 1px; background: #2a3f5f; margin: 8px 0;';
    container.appendChild(divider);
    
    subPlayers.forEach(player => {
        const item = createPlayerItem(player, true);
        container.appendChild(item);
    });
}

function createPlayerItem(player, isSubstitute = false) {
    const item = document.createElement('div');
    item.className = 'player-item ' + (player.stamina < 60 ? 'low-stamina' : '');
    item.id = 'player-' + player.id;
    
    const staminaClass = player.stamina < 60 ? 'low' : '';
    const statusColor = isSubstitute ? '#8ba3c7' : '#00d4ff';
    
    item.innerHTML = `
        <div class="player-avatar">${player.number}</div>
        <div class="player-info">
            <div class="player-name">
                ${player.name}
                <span style="font-size: 10px; color: ${statusColor}; margin-left: 6px;">${player.position}</span>
            </div>
            <div class="player-stamina-mini">
                <div class="stamina-bar-mini">
                    <div class="stamina-fill-mini ${staminaClass}" style="width: ${Math.round(player.stamina)}%"></div>
                </div>
                <span class="stamina-text-mini">${Math.round(player.stamina)}%</span>
            </div>
        </div>
    `;
    
    return item;
}

function updatePlayersFromAPI(apiPlayers) {
    const oldPlayers = JSON.parse(JSON.stringify(players));
    players = apiPlayers;
    
    players.forEach(player => {
        if (!staminaHistory[player.id]) {
            staminaHistory[player.id] = [];
        }
        staminaHistory[player.id].push(player.stamina);
        if (staminaHistory[player.id].length > 50) {
            staminaHistory[player.id].shift();
        }
        
        const oldPlayer = oldPlayers.find(p => p.id === player.id);
        if (oldPlayer && oldPlayer.status === '场上' && player.status === '场上') {
            checkSubstitutionNeed(player);
        }
    });
    
    updatePlayerDisplay();
    updateLockerDisplays();
}

function updatePlayerDisplay() {
    players.forEach(player => {
        const item = document.getElementById('player-' + player.id);
        if (item) {
            item.classList.toggle('low-stamina', player.stamina < 60);
            
            const fill = item.querySelector('.stamina-fill-mini');
            const text = item.querySelector('.stamina-text-mini');
            
            if (fill) {
                fill.style.width = Math.round(player.stamina) + '%';
                fill.classList.toggle('low', player.stamina < 60);
            }
            if (text) {
                text.textContent = Math.round(player.stamina) + '%';
            }
        }
    });
}

function checkSubstitutionNeed(player) {
    if (player.status !== '场上') return;
    if (substitutionSuggested[player.id]) return;
    
    if (player.stamina < 60) {
        substitutionSuggested[player.id] = true;
        suggestSubstitution(player);
    }
}

function suggestSubstitution(tiredPlayer) {
    const substitutes = players.filter(p => p.status === '替补' && p.stamina > 80);
    if (substitutes.length === 0) return;
    
    const subPlayer = substitutes.reduce((best, current) => 
        current.stamina > best.stamina ? current : best
    );
    
    document.getElementById('tiredPlayerNumber').textContent = tiredPlayer.number;
    document.getElementById('tiredPlayerName').textContent = tiredPlayer.name;
    document.getElementById('tiredPlayerStamina').style.width = Math.round(tiredPlayer.stamina) + '%';
    
    document.getElementById('subPlayerNumber').textContent = subPlayer.number;
    document.getElementById('subPlayerName').textContent = subPlayer.name;
    
    document.getElementById('substituteModal').dataset.tiredId = tiredPlayer.id;
    document.getElementById('substituteModal').dataset.subId = subPlayer.id;
    
    document.getElementById('substituteModal').style.display = 'flex';
    
    showNotification('换人建议', tiredPlayer.name + ' 体力不足(' + Math.round(tiredPlayer.stamina) + '%)，建议换上 ' + subPlayer.name, 'warning');
}

function confirmSubstitution() {
    const modal = document.getElementById('substituteModal');
    const tiredId = parseInt(modal.dataset.tiredId);
    const subId = parseInt(modal.dataset.subId);
    
    API.substitution(tiredId, subId).then(result => {
        if (result && result.success) {
            showNotification('换人完成', result.subPlayer.name + ' 替换 ' + result.tiredPlayer.name, 'success');
            
            const tiredPlayer = players.find(p => p.id === tiredId);
            const subPlayer = players.find(p => p.id === subId);
            if (tiredPlayer) tiredPlayer.status = '替补';
            if (subPlayer) subPlayer.status = '场上';
            substitutionSuggested[tiredId] = false;
            
            renderPlayerList();
            updateLockerDisplays();
        }
    });
    
    closeModal('substituteModal');
}

function updateLockerDisplays() {
    if (!lockerGroup) return;
    
    lockerGroup.traverse((child) => {
        if (child.userData && child.userData.type === 'lockerDisplay') {
            const playerId = child.userData.playerId;
            const player = players.find(p => p.number === playerId);
            
            if (player) {
                const emissive = player.status === '场上' ? 0x00ff88 : 0x888888;
                child.material.emissive.setHex(emissive);
                child.material.emissiveIntensity = player.status === '场上' ? 0.8 : 0.2;
            }
        }
    });
}

function getPlayersForExport() {
    return players.map(p => ({
        '号码': p.number,
        '姓名': p.name,
        '位置': p.position,
        '状态': p.status,
        '体力': Math.round(p.stamina) + '%',
        '建议': p.stamina < 60 ? '建议换人' : '正常'
    }));
}

function getStaminaCurves() {
    return Object.entries(staminaHistory).map(([id, history]) => {
        const player = players.find(p => p.id === parseInt(id));
        return {
            player: player ? player.name : 'Player ' + id,
            history: history
        };
    });
}
