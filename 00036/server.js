const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${req.method} ${req.url}`);
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'public')));

let gameState = {
    matchTime: 65,
    matchStatus: '进行中',
    homeTeam: '巴塞罗那',
    awayTeam: '皇家马德里',
    score: { home: 2, away: 1 },
    currentFormation: '4-3-3',
    possession: { home: 58, away: 42 },
    keyMoments: [
        { time: 12, type: 'goal', team: 'home', player: '梅西', description: '梅西禁区内抽射破门' },
        { time: 28, type: 'yellow', team: 'away', player: '拉莫斯', description: '拉莫斯犯规吃到黄牌' },
        { time: 45, type: 'goal', team: 'away', player: '本泽马', description: '本泽马头球扳平比分' },
        { time: 52, type: 'goal', team: 'home', player: '苏亚雷斯', description: '苏亚雷斯反超比分' }
    ]
};

let attendanceData = {
    A: { total: 120, sold: 114, rate: 95 },
    B: { total: 120, sold: 94, rate: 78 },
    C: { total: 120, sold: 30, rate: 25 },
    D: { total: 120, sold: 74, rate: 62 },
    E: { total: 120, sold: 54, rate: 45 }
};

let lawnData = {
    temperature: 29.5,
    humidity: 62,
    light: 8500,
    ph: 6.8,
    sprinklerActive: true,
    sprinklerManual: false
};

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

let securityAlerts = [
    {
        id: 1, type: 'suspicious', title: '可疑物品检测',
        description: 'B区入口发现无人认领包裹', zone: 'B', time: '14:25:30',
        camera: 'B-01', status: 'active'
    },
    {
        id: 2, type: 'loitering', title: '人员滞留警告',
        description: 'C区3排有人滞留超过30分钟', zone: 'C', time: '14:20:15',
        camera: 'C-03', status: 'active'
    }
];

let securityEvents = [];
let maintenanceLogs = [];
let energyData = {
    lighting: 1250, aircon: 2800, water: 15.3, total: 4065.3
};

let lightingStates = {
    A: { dimmed: false, intensity: 1.2 },
    B: { dimmed: false, intensity: 1.2 },
    C: { dimmed: true, intensity: 0.4 },
    D: { dimmed: false, intensity: 1.2 },
    E: { dimmed: false, intensity: 1.2 }
};

let manualLightingOverride = false;

const formations = {
    '4-3-3': { name: '4-3-3 控球阵型' },
    '4-2-3-1': { name: '4-2-3-1 防守反击' },
    '3-5-2': { name: '3-5-2 进攻阵型' }
};

function updateAttendance() {
    Object.keys(attendanceData).forEach(zone => {
        const change = Math.floor(Math.random() * 5) - 2;
        attendanceData[zone].sold = Math.max(0, Math.min(attendanceData[zone].total, attendanceData[zone].sold + change));
        attendanceData[zone].rate = Math.round((attendanceData[zone].sold / attendanceData[zone].total) * 100);
    });
    
    if (!manualLightingOverride) {
        Object.keys(lightingStates).forEach(zone => {
            const shouldDim = attendanceData[zone].rate < 30;
            if (shouldDim !== lightingStates[zone].dimmed) {
                lightingStates[zone].dimmed = shouldDim;
                lightingStates[zone].intensity = shouldDim ? 0.4 : 1.2;
                if (shouldDim) {
                    addMaintenanceLog('节能控制', zone + '区灯光已调暗');
                }
            }
        });
    }
}

function updateLawn() {
    lawnData.temperature += (Math.random() - 0.48) * 0.3;
    lawnData.temperature = Math.max(15, Math.min(35, lawnData.temperature));
    
    lawnData.humidity += (Math.random() - 0.5);
    lawnData.humidity = Math.max(30, Math.min(90, lawnData.humidity));
    
    lawnData.light += (Math.random() - 0.5) * 200;
    lawnData.light = Math.max(1000, Math.min(15000, lawnData.light));
    
    lawnData.ph += (Math.random() - 0.5) * 0.05;
    lawnData.ph = Math.max(5.5, Math.min(7.5, lawnData.ph));
    
    if (!lawnData.sprinklerManual) {
        const shouldActivate = lawnData.temperature > 28;
        if (shouldActivate !== lawnData.sprinklerActive) {
            lawnData.sprinklerActive = shouldActivate;
            if (shouldActivate) {
                addMaintenanceLog('喷灌系统启动', '温度: ' + lawnData.temperature.toFixed(1) + '°C');
            }
        }
    }
}

function updatePlayers() {
    players.forEach(player => {
        if (player.status === '场上') {
            const consumption = 0.3 + Math.random() * 0.5;
            player.stamina = Math.max(0, player.stamina - consumption);
            
            player.heatmap.push({
                x: (Math.random() - 0.5) * 40,
                z: (Math.random() - 0.5) * 50,
                intensity: player.stamina / 100
            });
            
            player.heatmap = player.heatmap.slice(-100);
        } else {
            const recovery = 0.2 + Math.random() * 0.3;
            player.stamina = Math.min(100, player.stamina + recovery);
        }
    });
}

function updateGameState() {
    gameState.matchTime += 0.5;
    
    if (Math.random() < 0.02) {
        checkKeyMoment();
    }
    
    gameState.possession.home = Math.max(30, Math.min(70, gameState.possession.home + (Math.random() - 0.5) * 2));
    gameState.possession.away = 100 - gameState.possession.home;
}

function checkKeyMoment() {
    const time = Math.floor(gameState.matchTime);
    const eventTypes = ['corner', 'freekick', 'substitution', 'tactical'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    const keyMoment = { 
        time, 
        type, 
        team: Math.random() > 0.5 ? 'home' : 'away', 
        player: players[Math.floor(Math.random() * 11)].name, 
        description: '' 
    };
    
    const teamName = keyMoment.team === 'home' ? gameState.homeTeam : gameState.awayTeam;
    
    switch(type) {
        case 'corner':
            keyMoment.description = teamName + ' 获得角球机会';
            break;
        case 'freekick':
            keyMoment.description = teamName + ' 获得前场任意球';
            break;
        case 'substitution':
            keyMoment.description = teamName + ' 请求换人';
            break;
        case 'tactical':
            keyMoment.description = teamName + ' 调整战术阵型';
            const formationKeys = Object.keys(formations);
            gameState.currentFormation = formationKeys[Math.floor(Math.random() * formationKeys.length)];
            break;
    }
    
    gameState.keyMoments.push(keyMoment);
    
    if (type === 'tactical') {
        addMaintenanceLog('战术调整', '切换为 ' + formations[gameState.currentFormation].name);
    }
}

function updateEnergy() {
    if (lawnData.sprinklerActive) {
        energyData.water += 0.05;
    }
    
    Object.keys(lightingStates).forEach(zone => {
        const rate = lightingStates[zone].dimmed ? 0.1 : 0.3;
        energyData.lighting += rate;
    });
    
    energyData.aircon += 0.5;
    energyData.total = energyData.lighting + energyData.aircon + energyData.water * 10;
}

function addMaintenanceLog(action, detail) {
    maintenanceLogs.unshift({
        time: new Date().toLocaleString('zh-CN'),
        action: action,
        detail: detail,
        temperature: lawnData.temperature.toFixed(1),
        humidity: lawnData.humidity.toFixed(0),
        ph: lawnData.ph.toFixed(1)
    });
    maintenanceLogs = maintenanceLogs.slice(0, 100);
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

setInterval(() => {
    updateAttendance();
    updateLawn();
    updatePlayers();
    updateGameState();
    updateEnergy();
    
    if (Math.random() < 0.1) {
        generateSecurityAlert();
    }
}, 2000);

function generateSecurityAlert() {
    const types = ['suspicious', 'loitering'];
    const type = types[Math.floor(Math.random() * types.length)];
    const zones = ['A', 'B', 'C', 'D', 'E'];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    
    const templates = {
        suspicious: [
            { title: '可疑物品检测', desc: zone + '区发现无人认领物品' },
            { title: '异常行为检测', desc: zone + '区检测到异常奔跑行为' }
        ],
        loitering: [
            { title: '人员滞留警告', desc: zone + '区有人滞留超过30分钟' },
            { title: '区域聚集警告', desc: zone + '区入口人员过度聚集' }
        ]
    };
    
    const template = templates[type][Math.floor(Math.random() * templates[type].length)];
    const now = new Date();
    
    const alert = {
        id: Date.now(),
        type: type,
        title: template.title,
        description: template.desc,
        zone: zone,
        time: now.toLocaleTimeString('zh-CN', { hour12: false }),
        camera: zone + '-' + String(Math.floor(Math.random() * 10)).padStart(2, '0'),
        status: 'active'
    };
    
    securityAlerts.unshift(alert);
    addSecurityEvent(template.title, template.desc, '高');
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/gamestate', (req, res) => {
    res.json(gameState);
});

app.get('/api/attendance', (req, res) => {
    res.json({
        data: attendanceData,
        lighting: lightingStates
    });
});

app.get('/api/lawn', (req, res) => {
    res.json(lawnData);
});

app.get('/api/players', (req, res) => {
    res.json(players);
});

app.get('/api/security/alerts', (req, res) => {
    res.json({
        alerts: securityAlerts,
        events: securityEvents
    });
});

app.get('/api/energy', (req, res) => {
    res.json(energyData);
});

app.get('/api/formation', (req, res) => {
    res.json({
        current: gameState.currentFormation,
        name: formations[gameState.currentFormation].name,
        formations: Object.keys(formations).map(key => ({
            key: key,
            name: formations[key].name
        }))
    });
});

app.get('/api/maintenance', (req, res) => {
    res.json(maintenanceLogs);
});

app.get('/api/face/recognize', (req, res) => {
    const zone = req.query.zone || 'A';
    const recognized = Math.floor(Math.random() * 50) + 10;
    res.json({
        zone: zone,
        recognized: recognized,
        timestamp: new Date().toISOString(),
        accuracy: (95 + Math.random() * 5).toFixed(1) + '%'
    });
});

app.post('/api/sprinkler/toggle', (req, res) => {
    lawnData.sprinklerManual = !lawnData.sprinklerManual;
    lawnData.sprinklerActive = !lawnData.sprinklerActive;
    addMaintenanceLog('手动控制', lawnData.sprinklerActive ? '喷灌系统手动开启' : '喷灌系统手动关闭');
    res.json({
        manual: lawnData.sprinklerManual,
        active: lawnData.sprinklerActive
    });
});

app.post('/api/lights/toggle', (req, res) => {
    manualLightingOverride = !manualLightingOverride;
    if (manualLightingOverride) {
        Object.keys(lightingStates).forEach(zone => {
            lightingStates[zone].dimmed = false;
            lightingStates[zone].intensity = 1.2;
        });
    }
    addMaintenanceLog('灯光控制', manualLightingOverride ? '切换为手动模式' : '切换为自动模式');
    res.json({ manual: manualLightingOverride, lighting: lightingStates });
});

app.post('/api/substitution', (req, res) => {
    const { tiredId, subId } = req.body;
    const tiredPlayer = players.find(p => p.id === tiredId);
    const subPlayer = players.find(p => p.id === subId);
    
    if (tiredPlayer && subPlayer) {
        tiredPlayer.status = '替补';
        subPlayer.status = '场上';
        addMaintenanceLog('人员调整', subPlayer.name + ' 替换 ' + tiredPlayer.name);
        addSecurityEvent('人员调整', subPlayer.name + ' 替换 ' + tiredPlayer.name);
        res.json({ success: true, tiredPlayer: tiredPlayer, subPlayer: subPlayer });
    } else {
        res.status(400).json({ success: false, error: '球员不存在' });
    }
});

app.post('/api/alert/resolve', (req, res) => {
    const { alertId } = req.body;
    const alert = securityAlerts.find(a => a.id === alertId);
    if (alert) {
        alert.status = 'resolved';
        addSecurityEvent('警报解除', alert.title + ' 已处理');
        res.json({ success: true, alert: alert });
    } else {
        res.status(400).json({ success: false, error: '警报不存在' });
    }
});

app.get('/api/export', (req, res) => {
    const wb = XLSX.utils.book_new();
    
    const dateStr = new Date().toISOString().split('T')[0];
    
    const totalAttendance = Object.values(attendanceData).reduce((sum, d) => sum + d.sold, 0);
    const totalSeats = Object.values(attendanceData).reduce((sum, d) => sum + d.total, 0);
    const avgAttendance = Math.round((totalAttendance / totalSeats) * 100);
    const activeAlerts = securityAlerts.filter(a => a.status === 'active').length;
    const lowStamina = players.filter(p => p.status === '场上' && p.stamina < 60).length;
    
    const overview = [
        { '项目': '报告日期', '数值': dateStr },
        { '项目': '比赛双方', '数值': gameState.homeTeam + ' vs ' + gameState.awayTeam },
        { '项目': '比赛时间', '数值': '第' + Math.floor(gameState.matchTime) + '分钟' },
        { '项目': '比分', '数值': gameState.score.home + ' - ' + gameState.score.away },
        { '项目': '控球率', '数值': gameState.possession.home + '% - ' + gameState.possession.away + '%' },
        { '项目': '当前阵型', '数值': formations[gameState.currentFormation].name },
        { '项目': '总座位数', '数值': totalSeats },
        { '项目': '已售座位', '数值': totalAttendance },
        { '项目': '平均上座率', '数值': avgAttendance + '%' },
        { '项目': '活跃安保警报', '数值': activeAlerts + ' 个' },
        { '项目': '体力不足球员', '数值': lowStamina + ' 人' },
        { '项目': '喷灌系统状态', '数值': lawnData.sprinklerActive ? '运行中' : '已关闭' },
        { '项目': '草坪温度', '数值': lawnData.temperature.toFixed(1) + '°C' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overview), '运营概览');
    
    const attendanceSheet = Object.entries(attendanceData).map(([zone, data]) => ({
        '区域': zone + '区',
        '总座位数': data.total,
        '已售出': data.sold,
        '上座率': data.rate + '%'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceSheet), '上座率统计');
    
    const lightingSheet = Object.entries(lightingStates).map(([zone, state]) => ({
        '区域': zone + '区',
        '状态': state.dimmed ? '节能模式' : '正常',
        '亮度': Math.round(state.intensity * 100) + '%',
        '节能效果': state.dimmed ? '-67%' : '0%'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lightingSheet), '灯光控制');
    
    const lawnSheet = [
        { '监测项目': '温度', '当前值': lawnData.temperature.toFixed(1) + '°C', '阈值': '>28°C启动喷灌', '状态': lawnData.temperature > 28 ? '超标' : '正常' },
        { '监测项目': '湿度', '当前值': lawnData.humidity.toFixed(0) + '%', '阈值': '40%-80%', '状态': lawnData.humidity >= 40 && lawnData.humidity <= 80 ? '正常' : '异常' },
        { '监测项目': '光照', '当前值': lawnData.light.toFixed(0) + ' lux', '阈值': '5000-12000 lux', '状态': '正常' },
        { '监测项目': 'pH值', '当前值': lawnData.ph.toFixed(1), '阈值': '6.0-7.0', '状态': lawnData.ph >= 6.0 && lawnData.ph <= 7.0 ? '正常' : '异常' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lawnSheet), '草坪监测');
    
    const playerSheet = players.map(p => ({
        '号码': p.number,
        '姓名': p.name,
        '位置': p.position,
        '状态': p.status,
        '体力': Math.round(p.stamina) + '%',
        '建议': p.stamina < 60 ? '建议换人' : '正常'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playerSheet), '球员状态');
    
    const securitySheet = [
        { '统计项': '活跃警报', '数量': securityAlerts.filter(a => a.status === 'active').length, '详情': securityAlerts.filter(a => a.status === 'active').map(a => a.title).join('; ') },
        { '统计项': '已处理警报', '数量': securityAlerts.filter(a => a.status === 'resolved').length, '详情': '已处理完毕' },
        { '统计项': '安保事件总数', '数量': securityEvents.length, '详情': '见事件记录表' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(securitySheet), '安保概览');
    
    if (securityAlerts.length > 0) {
        const alertSheet = securityAlerts.map(alert => ({
            '时间': alert.time,
            '类型': alert.type === 'suspicious' ? '可疑物品' : '人员滞留',
            '标题': alert.title,
            '描述': alert.description,
            '区域': alert.zone + '区',
            '关联摄像头': alert.camera,
            '状态': alert.status === 'active' ? '处理中' : '已解决'
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alertSheet), '安保警报记录');
    }
    
    if (securityEvents.length > 0) {
        const eventSheet = securityEvents.map(event => ({
            '时间': event.time,
            '事件类型': event.type,
            '描述': event.description,
            '级别': event.level
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eventSheet), '安保事件记录');
    }
    
    if (maintenanceLogs.length > 0) {
        const maintSheet = maintenanceLogs.map(log => ({
            '时间': log.time,
            '操作': log.action,
            '详情': log.detail,
            '温度(°C)': log.temperature,
            '湿度(%)': log.humidity,
            'pH值': log.ph
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(maintSheet), '养护日志');
    }
    
    const lightingSaving = Object.values(lightingStates).filter(s => s.dimmed).length * 67;
    const energySheet = [
        { '能耗类型': '照明能耗', '消耗量': energyData.lighting.toFixed(1) + ' kWh', '费用估算': '¥' + (energyData.lighting * 1.2).toFixed(2), '节能情况': lightingSaving > 0 ? '节能 ' + lightingSaving + '%' : '正常模式' },
        { '能耗类型': '空调能耗', '消耗量': energyData.aircon.toFixed(1) + ' kWh', '费用估算': '¥' + (energyData.aircon * 1.5).toFixed(2), '节能情况': '正常运行' },
        { '能耗类型': '喷灌用水', '消耗量': energyData.water.toFixed(1) + ' m³', '费用估算': '¥' + (energyData.water * 5.5).toFixed(2), '节能情况': lawnData.sprinklerActive ? '自动控制中' : '已关闭' },
        { '能耗类型': '总能耗', '消耗量': energyData.total.toFixed(1) + ' kWh', '费用估算': '¥' + ((energyData.lighting * 1.2) + (energyData.aircon * 1.5) + (energyData.water * 5.5)).toFixed(2), '节能情况': lightingSaving > 0 ? '已节约 ¥' + ((energyData.lighting * 1.2 * lightingSaving) / 100).toFixed(2) : '无' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(energySheet), '能耗统计');
    
    const fileName = '场馆运营报表_' + dateStr + '.xlsx';
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename*=UTF-8\'\'' + encodedFileName);
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
    
    addMaintenanceLog('报表导出', '导出 ' + dateStr + ' 运营数据报表');
});

const cameraScenes = [
    { name: 'B区入口', desc: '观众入场检查' },
    { name: 'C区看台', desc: '观众席监控' },
    { name: '球员通道', desc: '球员进出通道' },
    { name: 'VIP包厢区', desc: 'VIP区域监控' },
    { name: '安保中心', desc: '安保控制室' },
    { name: '草坪区域', desc: '场地监控' },
    { name: '东看台', desc: '观众席全景' },
    { name: '西看台', desc: '观众席全景' }
];

app.get('/api/camera/list', (req, res) => {
    const cameras = [];
    const zones = ['A', 'B', 'C', 'D', 'E'];
    zones.forEach(zone => {
        for (let i = 1; i <= 5; i++) {
            const scene = cameraScenes[Math.floor(Math.random() * cameraScenes.length)];
            cameras.push({
                id: zone + '-' + String(i).padStart(2, '0'),
                name: scene.name,
                description: scene.desc,
                zone: zone,
                status: 'online'
            });
        }
    });
    res.json(cameras);
});

app.get('/api/camera/image', (req, res) => {
    const cameraId = req.query.id || 'B-01';
    const sceneIndex = parseInt(cameraId.split('-')[1]) % cameraScenes.length;
    const scene = cameraScenes[sceneIndex];
    
    const width = 640;
    const height = 360;
    
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1a2744;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0a0e1a;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="scan" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:0" />
          <stop offset="50%" style="stop-color:#00d4ff;stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      
      <rect x="20" y="20" width="600" height="320" fill="none" stroke="#2a3f5f" stroke-width="3"/>
      <line x1="160" y1="20" x2="160" y2="340" stroke="#2a3f5f" stroke-width="2" stroke-dasharray="5,5"/>
      <line x1="320" y1="20" x2="320" y2="340" stroke="#2a3f5f" stroke-width="2" stroke-dasharray="5,5"/>
      <line x1="480" y1="20" x2="480" y2="340" stroke="#2a3f5f" stroke-width="2" stroke-dasharray="5,5"/>
      <line x1="20" y1="120" x2="620" y2="120" stroke="#2a3f5f" stroke-width="2" stroke-dasharray="5,5"/>
      <line x1="20" y1="240" x2="620" y2="240" stroke="#2a3f5f" stroke-width="2" stroke-dasharray="5,5"/>
      
      <g fill="#4a5f7f" opacity="0.6">
        <circle cx="80" cy="80" r="8"/>
        <circle cx="120" cy="100" r="6"/>
        <circle cx="200" cy="60" r="7"/>
        <circle cx="280" cy="90" r="8"/>
        <circle cx="360" cy="70" r="6"/>
        <circle cx="440" cy="110" r="7"/>
        <circle cx="520" cy="85" r="8"/>
        <circle cx="580" cy="95" r="6"/>
        <circle cx="100" cy="180" r="7"/>
        <circle cx="220" cy="200" r="8"/>
        <circle cx="350" cy="170" r="6"/>
        <circle cx="480" cy="190" r="7"/>
        <circle cx="560" cy="210" r="8"/>
        <circle cx="150" cy="280" r="6"/>
        <circle cx="300" cy="300" r="7"/>
        <circle cx="450" cy="290" r="8"/>
      </g>
      
      <g fill="#ff6600" opacity="0.8">
        <circle cx="250" cy="150" r="10"/>
        <circle cx="400" cy="170" r="9"/>
        <circle cx="500" cy="250" r="10"/>
      </g>
      
      <rect y="0" width="100%" height="60" fill="url(#scan)" opacity="0.5">
        <animate attributeName="y" from="0" to="360" dur="3s" repeatCount="indefinite"/>
      </rect>
      
      <rect x="20" y="320" width="200" height="35" fill="rgba(0,0,0,0.7)" rx="5"/>
      <text x="35" y="343" fill="#00d4ff" font-family="monospace" font-size="14" font-weight="bold">● ${cameraId} LIVE</text>
      
      <rect x="480" y="320" width="140" height="35" fill="rgba(0,0,0,0.7)" rx="5"/>
      <text x="495" y="343" fill="#ffffff" font-family="monospace" font-size="14">${new Date().toLocaleTimeString('zh-CN', { hour12: false })}</text>
      
      <rect x="20" y="20" width="180" height="50" fill="rgba(0,0,0,0.7)" rx="5"/>
      <text x="35" y="45" fill="#00ff88" font-family="sans-serif" font-size="14" font-weight="bold">${scene.name}</text>
      <text x="35" y="62" fill="#8ba3c7" font-family="sans-serif" font-size="11">${scene.desc}</text>
      
      <rect x="520" y="20" width="100" height="25" fill="rgba(255,68,68,0.3)" stroke="#ff4444" stroke-width="2" rx="3"/>
      <text x="538" y="37" fill="#ff4444" font-family="sans-serif" font-size="12" font-weight="bold">REC ●</text>
      
      <g fill="#8ba3c7" font-family="monospace" font-size="10" opacity="0.7">
        <text x="30" y="100">X: ${(Math.random() * 100).toFixed(1)}%</text>
        <text x="30" y="115">Y: ${(Math.random() * 100).toFixed(1)}%</text>
        <text x="30" y="130">Z: ${(Math.random() * 100).toFixed(1)}%</text>
      </g>
    </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(svg);
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

addMaintenanceLog('系统启动', '场馆运营管理平台后端服务已启动');
addSecurityEvent('系统启动', '后端服务正常运行');

app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 智慧体育场馆后端服务已启动');
    console.log('========================================');
    console.log('📡  API 服务: http://localhost:' + PORT + '/api/');
    console.log('🌐 前端页面: http://localhost:' + PORT + '/');
    console.log('📊 健康检查: http://localhost:' + PORT + '/api/health');
    console.log('========================================');
    console.log('可用API:');
    console.log('  GET  /api/health          - 健康检查');
    console.log('  GET  /api/gamestate       - 比赛状态');
    console.log('  GET  /api/attendance      - 上座率数据');
    console.log('  GET  /api/lawn            - 草坪监测');
    console.log('  GET  /api/players         - 球员数据');
    console.log('  GET  /api/security/alerts - 安保警报');
    console.log('  GET  /api/energy          - 能耗数据');
    console.log('  GET  /api/formation       - 战术阵型');
    console.log('  GET  /api/face/recognize  - 人脸识别模拟');
    console.log('  GET  /api/export          - 导出Excel报表');
    console.log('  POST /api/sprinkler/toggle - 喷灌控制');
    console.log('  POST /api/lights/toggle   - 灯光控制');
    console.log('  POST /api/substitution    - 换人操作');
    console.log('  POST /api/alert/resolve   - 处理警报');
    console.log('========================================');
});
