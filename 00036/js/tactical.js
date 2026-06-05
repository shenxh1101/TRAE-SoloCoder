let tacticalCanvas, tacticalCtx;
let currentFormation = '4-3-3';
let formationAnimationFrame = 0;
let ballPosition = { x: 0, y: 0 };
let ballTarget = { x: 0, y: 0 };

const formations = {
    '4-3-3': {
        name: '4-3-3 控球阵型',
        players: [
            { x: 0.1, y: 0.5, number: 1, role: 'GK' },
            { x: 0.3, y: 0.2, number: 4, role: 'RB' },
            { x: 0.3, y: 0.4, number: 3, role: 'CB' },
            { x: 0.3, y: 0.6, number: 15, role: 'CB' },
            { x: 0.3, y: 0.8, number: 18, role: 'LB' },
            { x: 0.5, y: 0.3, number: 21, role: 'CM' },
            { x: 0.5, y: 0.5, number: 5, role: 'DM' },
            { x: 0.5, y: 0.7, number: 16, role: 'CM' },
            { x: 0.75, y: 0.25, number: 11, role: 'RW' },
            { x: 0.75, y: 0.5, number: 9, role: 'ST' },
            { x: 0.75, y: 0.75, number: 10, role: 'LW' }
        ]
    },
    '4-2-3-1': {
        name: '4-2-3-1 防守反击',
        players: [
            { x: 0.1, y: 0.5, number: 1, role: 'GK' },
            { x: 0.3, y: 0.2, number: 20, role: 'RB' },
            { x: 0.3, y: 0.4, number: 3, role: 'CB' },
            { x: 0.3, y: 0.6, number: 15, role: 'CB' },
            { x: 0.3, y: 0.8, number: 18, role: 'LB' },
            { x: 0.45, y: 0.35, number: 5, role: 'DM' },
            { x: 0.45, y: 0.65, number: 21, role: 'DM' },
            { x: 0.6, y: 0.25, number: 11, role: 'RM' },
            { x: 0.6, y: 0.5, number: 10, role: 'AM' },
            { x: 0.6, y: 0.75, number: 16, role: 'LM' },
            { x: 0.8, y: 0.5, number: 9, role: 'ST' }
        ]
    },
    '3-5-2': {
        name: '3-5-2 进攻阵型',
        players: [
            { x: 0.1, y: 0.5, number: 1, role: 'GK' },
            { x: 0.3, y: 0.3, number: 4, role: 'CB' },
            { x: 0.3, y: 0.5, number: 3, role: 'CB' },
            { x: 0.3, y: 0.7, number: 15, role: 'CB' },
            { x: 0.45, y: 0.15, number: 20, role: 'RM' },
            { x: 0.45, y: 0.35, number: 21, role: 'CM' },
            { x: 0.45, y: 0.5, number: 5, role: 'CM' },
            { x: 0.45, y: 0.65, number: 16, role: 'CM' },
            { x: 0.45, y: 0.85, number: 18, role: 'LM' },
            { x: 0.7, y: 0.35, number: 10, role: 'ST' },
            { x: 0.7, y: 0.65, number: 9, role: 'ST' }
        ]
    }
};

let playerPositions = [];
let playerTargets = [];

function initTacticalScreen() {
    tacticalCanvas = document.getElementById('tacticalCanvas');
    tacticalCtx = tacticalCanvas.getContext('2d');
    
    resizeTacticalCanvas();
    window.addEventListener('resize', resizeTacticalCanvas);
    
    const formation = formations[currentFormation];
    playerPositions = formation.players.map(p => ({ x: p.x, y: p.y }));
    playerTargets = formation.players.map(p => ({ x: p.x, y: p.y }));
    
    animateTacticalScreen();
}

function resizeTacticalCanvas() {
    const container = document.getElementById('tacticalScreen');
    if (container && tacticalCanvas) {
        tacticalCanvas.width = container.clientWidth;
        tacticalCanvas.height = container.clientHeight;
    }
}

function animateTacticalScreen() {
    if (!tacticalCanvas || !tacticalCtx) return;
    
    const w = tacticalCanvas.width;
    const h = tacticalCanvas.height;
    
    tacticalCtx.clearRect(0, 0, w, h);
    
    drawField(w, h);
    drawPlayers(w, h);
    drawBall(w, h);
    
    updatePlayerPositions();
    updateBallPosition();
    
    requestAnimationFrame(animateTacticalScreen);
}

function drawField(w, h) {
    tacticalCtx.fillStyle = '#1a4d2e';
    tacticalCtx.fillRect(0, 0, w, h);
    
    tacticalCtx.strokeStyle = '#ffffff';
    tacticalCtx.lineWidth = 2;
    
    tacticalCtx.strokeRect(10, 10, w - 20, h - 20);
    
    tacticalCtx.beginPath();
    tacticalCtx.moveTo(w / 2, 10);
    tacticalCtx.lineTo(w / 2, h - 10);
    tacticalCtx.stroke();
    
    tacticalCtx.beginPath();
    tacticalCtx.arc(w / 2, h / 2, 30, 0, Math.PI * 2);
    tacticalCtx.stroke();
    
    tacticalCtx.beginPath();
    tacticalCtx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
    tacticalCtx.fillStyle = '#ffffff';
    tacticalCtx.fill();
    
    tacticalCtx.strokeRect(10, h * 0.3, 40, h * 0.4);
    tacticalCtx.strokeRect(10, h * 0.4, 25, h * 0.2);
    
    tacticalCtx.strokeRect(w - 50, h * 0.3, 40, h * 0.4);
    tacticalCtx.strokeRect(w - 35, h * 0.4, 25, h * 0.2);
    
    tacticalCtx.beginPath();
    tacticalCtx.arc(50, h / 2, 8, 0, Math.PI * 2);
    tacticalCtx.stroke();
    
    tacticalCtx.beginPath();
    tacticalCtx.arc(w - 50, h / 2, 8, 0, Math.PI * 2);
    tacticalCtx.stroke();
}

function drawPlayers(w, h) {
    const formation = formations[currentFormation];
    if (!formation) return;
    
    formation.players.forEach((player, index) => {
        const pos = playerPositions[index] || { x: player.x, y: player.y };
        const px = pos.x * (w - 40) + 20;
        const py = pos.y * (h - 40) + 20;
        
        const gradient = tacticalCtx.createRadialGradient(px, py, 0, px, py, 18);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        tacticalCtx.fillStyle = gradient;
        tacticalCtx.beginPath();
        tacticalCtx.arc(px, py, 18, 0, Math.PI * 2);
        tacticalCtx.fill();
        
        tacticalCtx.fillStyle = '#0066cc';
        tacticalCtx.beginPath();
        tacticalCtx.arc(px, py, 12, 0, Math.PI * 2);
        tacticalCtx.fill();
        
        tacticalCtx.strokeStyle = '#ffffff';
        tacticalCtx.lineWidth = 2;
        tacticalCtx.stroke();
        
        tacticalCtx.fillStyle = '#ffffff';
        tacticalCtx.font = 'bold 10px Arial';
        tacticalCtx.textAlign = 'center';
        tacticalCtx.textBaseline = 'middle';
        tacticalCtx.fillText(player.number, px, py);
        
        tacticalCtx.fillStyle = '#ffffff';
        tacticalCtx.font = '9px Arial';
        tacticalCtx.fillText(player.role, px, py + 18);
    });
}

function drawBall(w, h) {
    const bx = ballPosition.x * (w - 40) + 20;
    const by = ballPosition.y * (h - 40) + 20;
    
    const gradient = tacticalCtx.createRadialGradient(bx, by, 0, bx, by, 10);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    tacticalCtx.fillStyle = gradient;
    tacticalCtx.beginPath();
    tacticalCtx.arc(bx, by, 10, 0, Math.PI * 2);
    tacticalCtx.fill();
    
    tacticalCtx.fillStyle = '#ffffff';
    tacticalCtx.beginPath();
    tacticalCtx.arc(bx, by, 6, 0, Math.PI * 2);
    tacticalCtx.fill();
    
    tacticalCtx.fillStyle = '#333333';
    tacticalCtx.beginPath();
    tacticalCtx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2);
    tacticalCtx.fill();
}

function updatePlayerPositions() {
    const formation = formations[currentFormation];
    if (!formation) return;
    
    playerTargets = formation.players.map(p => ({
        x: p.x + (Math.random() - 0.5) * 0.02,
        y: p.y + (Math.random() - 0.5) * 0.02
    }));
    
    playerPositions.forEach((pos, index) => {
        if (!pos) return;
        const target = playerTargets[index];
        if (!target) return;
        pos.x += (target.x - pos.x) * 0.05;
        pos.y += (target.y - pos.y) * 0.05;
    });
}

function updateBallPosition() {
    if (Math.random() < 0.02) {
        ballTarget = {
            x: 0.2 + Math.random() * 0.6,
            y: 0.2 + Math.random() * 0.6
        };
    }
    
    ballPosition.x += (ballTarget.x - ballPosition.x) * 0.03;
    ballPosition.y += (ballTarget.y - ballPosition.y) * 0.03;
}

function setFormation(formationKey) {
    if (formations[formationKey]) {
        const oldFormation = currentFormation;
        currentFormation = formationKey;
        const formation = formations[currentFormation];
        
        if (oldFormation !== formationKey) {
            showNotification('战术调整', '阵型切换为: ' + formation.name, 'info');
        }
        
        playerTargets = formation.players.map(p => ({ x: p.x, y: p.y }));
        if (playerPositions.length === 0) {
            playerPositions = formation.players.map(p => ({ x: p.x, y: p.y }));
        }
    }
}
