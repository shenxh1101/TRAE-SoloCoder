const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const dom = new JSDOM(htmlContent, {
    url: 'http://localhost:8000',
    runScripts: 'dangerously',
    pretendToBeVisual: true
});

const { window } = dom;

window.HTMLCanvasElement.prototype.getContext = function() {
    return {
        fillRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        fill: () => {},
        stroke: () => {},
        arc: () => {},
        fillText: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        scale: () => {}
    };
};

window.HTMLCanvasElement.prototype.getBoundingClientRect = function() {
    return { width: 500, height: 200 };
};

window.requestAnimationFrame = function(cb) {
    return setTimeout(() => cb(Date.now()), 16);
};

window.cancelAnimationFrame = function(id) {
    clearTimeout(id);
};

let localStorageData = {};
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: (key) => localStorageData[key] || null,
        setItem: (key, val) => { localStorageData[key] = String(val); },
        removeItem: (key) => { delete localStorageData[key]; },
        clear: () => { localStorageData = {}; },
        get length() { return Object.keys(localStorageData).length; },
        key: (i) => Object.keys(localStorageData)[i]
    },
    writable: false
});

let confirmResult = true;
window.confirm = () => confirmResult;

function loadScript(filename) {
    const content = fs.readFileSync(path.join(__dirname, 'js', filename), 'utf8');
    window.eval(content);
}

loadScript('save.js');
loadScript('stations.js');
loadScript('employees.js');
loadScript('orders.js');
loadScript('stats.js');
loadScript('game.js');
loadScript('ui.js');

window.UI.init();
window.Game.init();

const testResults = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        testResults.push({ name, passed: true });
        passed++;
        return true;
    } catch (e) {
        console.log(`  ✗ ${name}`);
        console.log(`    错误: ${e.message}`);
        testResults.push({ name, passed: false, error: e.message });
        failed++;
        return false;
    }
}

async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        testResults.push({ name, passed: true });
        passed++;
        return true;
    } catch (e) {
        console.log(`  ✗ ${name}`);
        console.log(`    错误: ${e.message}`);
        testResults.push({ name, passed: false, error: e.message });
        failed++;
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}

function getEl(id) {
    const el = window.document.getElementById(id);
    if (!el) throw new Error(`找不到元素 #${id}`);
    return el;
}

function clickEl(id) {
    const el = getEl(id);
    el.click();
    return el;
}

async function runTests() {
    console.log('\n=== 车间生产模拟游戏 - 端到端测试 ===\n');
    
    console.log('环境: jsdom 模拟浏览器');
    console.log('页面: index.html\n');
    
    console.log('检查模块加载...');
    if (!window.Game) {
        console.log('  ✗ Game 模块未加载');
        console.log('  可用的全局对象:', Object.keys(window).filter(k => k.length < 15));
        return;
    }
    console.log('  ✓ 所有模块已加载');
    
    await sleep(200);
    
    console.log('\n1. 页面初始化测试');
    test('页面标题正确', () => {
        if (window.document.title !== '车间生产模拟游戏') {
            throw new Error(`标题是 "${window.document.title}"，期望 "车间生产模拟游戏"`);
        }
    });
    
    test('顶部状态栏元素存在', () => {
        getEl('money');
        getEl('total-income');
        getEl('game-time');
    });
    
    test('控制按钮元素存在', () => {
        getEl('btn-pause');
        getEl('btn-save');
        getEl('btn-load');
    });
    
    test('初始资金显示正确', () => {
        const moneyEl = getEl('money');
        const text = moneyEl.textContent.replace(/[^\d]/g, '');
        if (text !== '10000') {
            throw new Error(`初始资金显示: ${moneyEl.textContent}，期望 ¥10,000`);
        }
    });
    
    test('初始总收入为0', () => {
        const incomeEl = getEl('total-income');
        const text = incomeEl.textContent.replace(/[^\d]/g, '');
        if (text !== '0') {
            throw new Error(`初始收入: ${incomeEl.textContent}，期望 ¥0`);
        }
    });
    
    test('游戏时间初始为0', () => {
        const timeEl = getEl('game-time');
        if (!timeEl.textContent.startsWith('00:00')) {
            throw new Error(`初始时间: ${timeEl.textContent}，期望 00:00:00`);
        }
    });
    
    test('初始暂停按钮显示播放图标', () => {
        const btn = getEl('btn-pause');
        const icon = btn.querySelector('i');
        if (!icon.classList.contains('fa-play')) {
            throw new Error('暂停按钮初始应显示播放图标');
        }
    });
    
    console.log('\n2. 基础控制测试');
    test('点击播放按钮开始游戏', () => {
        const btn = getEl('btn-pause');
        btn.click();
        const icon = btn.querySelector('i');
        if (!icon.classList.contains('fa-pause')) {
            throw new Error('点击后应显示暂停图标');
        }
    });
    
    test('速度切换到2x', () => {
        const btn = window.document.querySelector('.speed-btn[data-speed="2"]');
        btn.click();
        if (!btn.classList.contains('active')) {
            throw new Error('2x按钮应激活');
        }
    });
    
    test('速度切换到4x', () => {
        const btn = window.document.querySelector('.speed-btn[data-speed="4"]');
        btn.click();
        if (!btn.classList.contains('active')) {
            throw new Error('4x按钮应激活');
        }
        const activeBtns = window.document.querySelectorAll('.speed-btn.active');
        if (activeBtns.length !== 1) {
            throw new Error('只能有一个速度按钮激活');
        }
    });
    
    test('速度切换到8x', () => {
        const btn = window.document.querySelector('.speed-btn[data-speed="8"]');
        btn.click();
        if (!btn.classList.contains('active')) {
            throw new Error('8x按钮应激活');
        }
    });
    
    test('速度切回1x', () => {
        const btn = window.document.querySelector('.speed-btn[data-speed="1"]');
        btn.click();
        if (!btn.classList.contains('active')) {
            throw new Error('1x按钮应激活');
        }
    });
    
    test('暂停游戏', () => {
        const btn = getEl('btn-pause');
        btn.click();
        const icon = btn.querySelector('i');
        if (!icon.classList.contains('fa-play')) {
            throw new Error('暂停后应显示播放图标');
        }
    });
    
    test('继续游戏', () => {
        const btn = getEl('btn-pause');
        btn.click();
        const icon = btn.querySelector('i');
        if (!icon.classList.contains('fa-pause')) {
            throw new Error('继续后应显示暂停图标');
        }
    });
    
    console.log('\n3. 标签页切换测试');
    test('切换到订单标签页', () => {
        const btn = window.document.querySelector('.tab-btn[data-tab="orders"]');
        btn.click();
        const pane = getEl('tab-orders');
        if (!pane.classList.contains('active')) {
            throw new Error('订单标签页应激活');
        }
        const activeBtns = window.document.querySelectorAll('.tab-btn.active');
        if (activeBtns.length !== 1) {
            throw new Error('只能有一个标签按钮激活');
        }
    });
    
    test('切换到员工标签页', () => {
        const btn = window.document.querySelector('.tab-btn[data-tab="employees"]');
        btn.click();
        const pane = getEl('tab-employees');
        if (!pane.classList.contains('active')) {
            throw new Error('员工标签页应激活');
        }
    });
    
    test('切换回工位标签页', () => {
        const btn = window.document.querySelector('.tab-btn[data-tab="stations"]');
        btn.click();
        const pane = getEl('tab-stations');
        if (!pane.classList.contains('active')) {
            throw new Error('工位标签页应激活');
        }
    });
    
    console.log('\n4. 经济系统测试');
    
    await testAsync('购买原材料 - 金属增加', async () => {
        const state = window.Game.getState();
        if (!state.isPaused) {
            window.Game.togglePause();
        }
        
        const initial = parseInt(getEl('raw-metal').textContent);
        const buyBtn = window.document.querySelector('.raw-materials .btn-primary');
        if (!buyBtn) throw new Error('找不到购买按钮');
        
        buyBtn.click();
        window.UI.invalidateCaches();
        await sleep(200);
        
        const after = parseInt(getEl('raw-metal').textContent);
        if (after !== initial + 50) {
            throw new Error(`金属从 ${initial} 变为 ${after}，期望 +50`);
        }
        
        window.Game.togglePause();
    });
    
    test('购买原材料 - 资金减少', () => {
        const moneyEl = getEl('money');
        const moneyStr = moneyEl.textContent.replace(/[^\d]/g, '');
        const money = parseInt(moneyStr);
        if (money > 9950) {
            throw new Error(`资金应为 ¥9,950，当前 ${moneyEl.textContent}`);
        }
    });
    
    test('产品库存显示存在', () => {
        const inventoryList = getEl('inventory-list');
        const items = inventoryList.querySelectorAll('.inventory-item');
        if (items.length < 3) {
            throw new Error(`应有至少3种产品库存，实际 ${items.length} 种`);
        }
    });
    
    await testAsync('直接销售产品 - 资金增加', async () => {
        const state = window.Game.getState();
        state.inventory.product_a = 10;
        state.inventory.product_b = 10;
        state.inventory.product_c = 10;
        
        window.UI.invalidateCaches();
        await sleep(200);
        
        const moneyBefore = parseInt(getEl('money').textContent.replace(/[^\d]/g, ''));
        
        const sellBtns = window.document.querySelectorAll('.inventory-item .btn-secondary');
        if (sellBtns.length === 0) throw new Error('找不到销售按钮');
        
        sellBtns[0].click();
        
        await sleep(200);
        
        const moneyAfter = parseInt(getEl('money').textContent.replace(/[^\d]/g, ''));
        if (moneyAfter <= moneyBefore) {
            throw new Error(`销售后资金应增加，之前 ¥${moneyBefore}，之后 ¥${moneyAfter}`);
        }
    });
    
    console.log('\n5. 工位系统测试');
    
    test('工位可视化元素存在', () => {
        const container = getEl('stations-container');
        const stations = container.querySelectorAll('.station-visual');
        if (stations.length !== 4) {
            throw new Error(`应有4个工位可视化元素，实际 ${stations.length} 个`);
        }
    });
    
    test('工位卡片存在', () => {
        const list = getEl('stations-list');
        const cards = list.querySelectorAll('.station-card');
        if (cards.length !== 4) {
            throw new Error(`应有4个工位卡片，实际 ${cards.length} 个`);
        }
    });
    
    test('工位显示等级', () => {
        const levelBadge = window.document.querySelector('.station-card .level');
        if (!levelBadge || !levelBadge.textContent.includes('Lv.')) {
            throw new Error('工位卡片应显示等级');
        }
    });
    
    test('升级速度按钮存在', () => {
        const upgradeBtns = window.document.querySelectorAll('.station-card .btn-secondary');
        if (upgradeBtns.length < 2) {
            throw new Error('每个工位应有2个升级按钮');
        }
    });
    
    await testAsync('点击升级速度 - 等级提升', async () => {
        const state = window.Game.getState();
        state.money = 100000;
        window.UI.invalidateCaches();
        await sleep(200);
        
        const firstStation = state.stations[0];
        const levelBefore = firstStation.speedLevel;
        
        const upgradeBtns = window.document.querySelectorAll('.station-card .btn-secondary');
        if (upgradeBtns.length === 0) throw new Error('找不到升级按钮');
        
        upgradeBtns[0].click();
        
        if (firstStation.speedLevel !== levelBefore + 1) {
            throw new Error(`速度等级应从 ${levelBefore} 升到 ${levelBefore + 1}，实际 ${firstStation.speedLevel}`);
        }
    });
    
    test('升级后资金减少', () => {
        const state = window.Game.getState();
        if (state.money >= 100000) {
            throw new Error('升级后资金应减少');
        }
    });
    
    await testAsync('点击升级可靠性', async () => {
        const state = window.Game.getState();
        state.money = 100000;
        window.UI.invalidateCaches();
        await sleep(200);
        
        const firstStation = state.stations[0];
        const levelBefore = firstStation.reliabilityLevel;
        
        const upgradeBtns = window.document.querySelectorAll('.station-card .btn-secondary');
        upgradeBtns[1].click();
        
        if (firstStation.reliabilityLevel !== levelBefore + 1) {
            throw new Error(`可靠等级应从 ${levelBefore} 升到 ${levelBefore + 1}，实际 ${firstStation.reliabilityLevel}`);
        }
    });
    
    await testAsync('资金不足时升级失败', async () => {
        const state = window.Game.getState();
        state.money = 10;
        window.UI.invalidateCaches();
        await sleep(200);
        
        const firstStation = state.stations[0];
        const levelBefore = firstStation.speedLevel;
        
        const upgradeBtns = window.document.querySelectorAll('.station-card .btn-secondary');
        upgradeBtns[0].click();
        
        if (firstStation.speedLevel !== levelBefore) {
            throw new Error('资金不足时不应升级');
        }
    });
    
    console.log('\n6. 订单系统测试');
    
    test('切换到订单标签页', () => {
        const btn = window.document.querySelector('.tab-btn[data-tab="orders"]');
        btn.click();
    });
    
    test('生成新订单按钮存在', () => {
        getEl('btn-new-order');
    });
    
    await testAsync('点击生成新订单', async () => {
        const state = window.Game.getState();
        if (!state.isPaused) {
            window.Game.togglePause();
            await sleep(50);
        }
        
        state.orders = [];
        window.UI.invalidateCaches();
        await sleep(200);
        
        const ordersBefore = state.orders.length;
        
        clickEl('btn-new-order');
        window.UI.invalidateCaches();
        await sleep(200);
        
        const ordersAfter = state.orders.length;
        if (ordersAfter < ordersBefore + 1) {
            throw new Error(`订单数应从 ${ordersBefore} 至少增加1，实际 ${ordersAfter}`);
        }
        
        window.Game.togglePause();
    });
    
    await testAsync('订单卡片显示', async () => {
        const state = window.Game.getState();
        if (state.orders.length === 0) {
            clickEl('btn-new-order');
            window.UI.invalidateCaches();
            await sleep(200);
        }
        
        const ordersList = getEl('orders-list');
        const cards = ordersList.querySelectorAll('.order-card');
        if (cards.length === 0) {
            throw new Error('应有订单卡片显示');
        }
    });
    
    test('订单显示奖励金额', () => {
        const rewardEl = window.document.querySelector('.order-reward');
        if (!rewardEl || !rewardEl.textContent.includes('¥')) {
            throw new Error('订单应显示奖励金额');
        }
    });
    
    test('订单显示倒计时', () => {
        const timerEl = window.document.querySelector('.order-timer');
        if (!timerEl) {
            throw new Error('订单应显示倒计时');
        }
    });
    
    await testAsync('手动交付订单', async () => {
        const state = window.Game.getState();
        if (!state.isPaused) {
            window.Game.togglePause();
            await sleep(50);
        }
        
        state.orders = [];
        state.inventory.product_a = 999;
        state.inventory.product_b = 999;
        state.inventory.product_c = 999;
        window.UI.invalidateCaches();
        await sleep(200);
        
        clickEl('btn-new-order');
        window.UI.invalidateCaches();
        await sleep(200);
        
        for (const order of state.orders) {
            order.canDeliver = true;
        }
        window.UI.invalidateCaches();
        await sleep(200);
        
        const ordersBefore = state.orders.length;
        const moneyBefore = state.money;
        
        const deliverBtn = window.document.querySelector('.order-card .btn-primary');
        if (deliverBtn && !deliverBtn.disabled) {
            deliverBtn.click();
            window.UI.invalidateCaches();
            await sleep(200);
            
            if (state.orders.length >= ordersBefore) {
                throw new Error('交付后订单应移除');
            }
            if (state.money <= moneyBefore) {
                throw new Error('交付后资金应增加');
            }
        } else {
            throw new Error('找不到可交付的订单按钮');
        }
        
        window.Game.togglePause();
    });
    
    console.log('\n7. 员工系统测试');
    
    test('切换到员工标签页', () => {
        const btn = window.document.querySelector('.tab-btn[data-tab="employees"]');
        btn.click();
    });
    
    test('我的员工区域存在', () => {
        getEl('my-employees');
    });
    
    test('雇佣市场区域存在', () => {
        getEl('employee-market');
    });
    
    test('刷新市场按钮存在', () => {
        getEl('btn-refresh-market');
    });
    
    test('雇佣市场显示候选员工', () => {
        const market = getEl('employee-market');
        const cards = market.querySelectorAll('.employee-card');
        if (cards.length < 3) {
            throw new Error(`雇佣市场应有至少3名候选员工，实际 ${cards.length} 名`);
        }
    });
    
    test('员工卡片显示技能条', () => {
        const skillBars = window.document.querySelectorAll('#employee-market .skill-bar');
        if (skillBars.length === 0) {
            throw new Error('员工卡片应显示技能条');
        }
    });
    
    test('员工显示工资', () => {
        const salaryEl = window.document.querySelector('#employee-market .employee-salary');
        if (!salaryEl || !salaryEl.textContent.includes('¥')) {
            throw new Error('员工应显示工资');
        }
    });
    
    await testAsync('雇佣员工 - 资金减少', async () => {
        const state = window.Game.getState();
        state.money = 10000;
        state.employees = [];
        const empsBefore = state.employees.length;
        const moneyBefore = state.money;
        window.UI.invalidateCaches();
        await sleep(200);
        
        const hireBtn = window.document.querySelector('#employee-market .btn-primary');
        if (hireBtn) {
            hireBtn.click();
            window.UI.invalidateCaches();
            await sleep(200);
            
            if (state.employees.length !== empsBefore + 1) {
                throw new Error(`员工数应从 ${empsBefore} 变为 ${empsBefore + 1}`);
            }
            if (state.money >= moneyBefore) {
                throw new Error('雇佣后资金应减少');
            }
        } else {
            throw new Error('找不到雇佣按钮');
        }
    });
    
    await testAsync('我的员工区域显示已雇佣员工', async () => {
        const state = window.Game.getState();
        if (state.employees.length === 0) {
            const hireBtn = window.document.querySelector('#employee-market .btn-primary');
            if (hireBtn) {
                hireBtn.click();
                window.UI.invalidateCaches();
                await sleep(200);
            }
        }
        
        const myEmps = getEl('my-employees');
        const cards = myEmps.querySelectorAll('.employee-card');
        if (cards.length === 0) {
            throw new Error('我的员工区域应显示已雇佣员工');
        }
    });
    
    await testAsync('员工分配下拉存在', async () => {
        const state = window.Game.getState();
        if (state.employees.length === 0) {
            const hireBtn = window.document.querySelector('#employee-market .btn-primary');
            if (hireBtn) {
                hireBtn.click();
                window.UI.invalidateCaches();
                await sleep(200);
            }
        }
        
        const select = window.document.querySelector('#my-employees .employee-assign');
        if (!select) {
            throw new Error('应有员工分配下拉框');
        }
    });
    
    await testAsync('刷新雇佣市场', async () => {
        const state = window.Game.getState();
        state.money = 10000;
        const market = getEl('employee-market');
        const firstCard = market.querySelector('.employee-card');
        const firstEmpId = firstCard ? firstCard.dataset.id : null;
        
        clickEl('btn-refresh-market');
        
        await sleep(200);
        
        const newFirstCard = market.querySelector('.employee-card');
        const newFirstEmpId = newFirstCard ? newFirstCard.dataset.id : null;
        
        if (newFirstEmpId === firstEmpId && firstEmpId) {
            throw new Error('刷新后员工列表应变化');
        }
        if (state.money >= 10000) {
            throw new Error('刷新市场应扣费 ¥500');
        }
    });
    
    test('解雇员工', () => {
        const state = window.Game.getState();
        const empsBefore = state.employees.length;
        
        const fireBtn = window.document.querySelector('#my-employees .btn-danger');
        if (fireBtn) {
            confirmResult = true;
            fireBtn.click();
            
            if (state.employees.length !== empsBefore - 1) {
                throw new Error('解雇后员工数应减少');
            }
        }
    });
    
    console.log('\n8. 存档系统测试');
    
    test('打开存档管理模态框', () => {
        clickEl('btn-load');
        const modal = getEl('save-modal');
        if (!modal.classList.contains('active')) {
            throw new Error('存档模态框应显示');
        }
    });
    
    test('新建存档按钮存在', () => {
        getEl('btn-new-save');
    });
    
    test('关闭模态框', () => {
        const closeBtn = window.document.querySelector('#save-modal .close-modal');
        closeBtn.click();
        const modal = getEl('save-modal');
        if (modal.classList.contains('active')) {
            throw new Error('模态框应关闭');
        }
    });
    
    await testAsync('手动保存游戏', async () => {
        localStorageData = {};
        const state = window.Game.getState();
        state.name = '测试工厂-E2E';
        state.money = 50000;
        
        clickEl('btn-save');
        
        await sleep(100);
        
        const saves = window.SaveSystem.getAllSaves();
        if (saves.length === 0) {
            throw new Error('保存后应有存档记录');
        }
        
        const loaded = window.SaveSystem.loadGame(saves[0].id);
        if (loaded.money !== 50000) {
            throw new Error(`存档资金应为 50000，实际 ${loaded.money}`);
        }
        if (loaded.name !== '测试工厂-E2E') {
            throw new Error(`存档名称应为 测试工厂-E2E，实际 ${loaded.name}`);
        }
    });
    
    test('创建多个存档', () => {
        localStorageData = {};
        for (let i = 1; i <= 5; i++) {
            window.SaveSystem.createNewSave(`工厂 ${i}`);
        }
        
        const saves = window.SaveSystem.getAllSaves();
        if (saves.length !== 5) {
            throw new Error(`应有5个存档，实际 ${saves.length} 个`);
        }
    });
    
    test('最多10个存档槽限制', () => {
        localStorageData = {};
        for (let i = 1; i <= 15; i++) {
            window.SaveSystem.createNewSave(`工厂 ${i}`);
        }
        
        const saves = window.SaveSystem.getAllSaves();
        if (saves.length !== 10) {
            throw new Error(`超过10个存档时应保留最新10个，实际 ${saves.length} 个`);
        }
    });
    
    await testAsync('点击保存按钮 - 显示通知', async () => {
        clickEl('btn-save');
        await sleep(100);
        
        const notification = getEl('notification');
        if (!notification.classList.contains('show')) {
            throw new Error('保存后应显示通知');
        }
        if (!notification.classList.contains('success')) {
            throw new Error('通知应为成功样式');
        }
    });
    
    console.log('\n9. UI更新测试');
    
    await testAsync('游戏运行后时间更新', async () => {
        const state = window.Game.getState();
        state.isPaused = true;
        state.gameTime = 0;
        window.UI.invalidateCaches();
        await sleep(200);
        
        const timeBefore = getEl('game-time').textContent;
        
        state.isPaused = false;
        state.gameTime += 10;
        window.UI.invalidateCaches();
        await sleep(200);
        
        const timeAfter = getEl('game-time').textContent;
        if (timeAfter === timeBefore) {
            throw new Error('游戏运行后时间应更新');
        }
    });
    
    await testAsync('故障计数显示', async () => {
        const state = window.Game.getState();
        state.failureCount = 5;
        window.UI.invalidateCaches();
        await sleep(200);
        
        const failCountEl = getEl('failure-count');
        if (failCountEl.textContent !== '5') {
            throw new Error(`故障计数应显示 5，实际 ${failCountEl.textContent}`);
        }
    });
    
    await testAsync('工位利用率显示', async () => {
        const state = window.Game.getState();
        if (!state.isPaused) {
            window.Game.togglePause();
        }
        
        state.hourlyUtilizationSum = 75;
        state.hourlyUtilizationCount = 1;
        window.UI.invalidateCaches();
        await sleep(200);
        
        const utilEl = getEl('station-utilization');
        if (!utilEl.textContent.includes('75')) {
            throw new Error(`利用率应显示 75%，实际 ${utilEl.textContent}`);
        }
        
        window.Game.togglePause();
    });
    
    test('通知系统显示', () => {
        window.UI.showNotification('测试通知', 'info');
        const notification = getEl('notification');
        if (!notification.classList.contains('show')) {
            throw new Error('通知应显示');
        }
        if (!notification.textContent.includes('测试通知')) {
            throw new Error('通知内容应正确');
        }
    });
    
    await testAsync('通知自动隐藏', async () => {
        window.UI.showNotification('自动隐藏测试', 'success');
        const notification = getEl('notification');
        
        if (!notification.classList.contains('show')) {
            throw new Error('通知应先显示');
        }
        
        await sleep(5000);
        
        if (notification.classList.contains('show')) {
            throw new Error('通知应在3.5秒后自动隐藏');
        }
    });
    
    console.log('\n10. 状态持久化测试');
    
    test('localStorage存储格式正确', () => {
        localStorageData = {};
        const state = window.Game.getState();
        window.SaveSystem.saveGame(state.id, state);
        
        const saved = localStorageData[`factory_game_${state.id}`];
        if (!saved) {
            throw new Error('localStorage中应有存档数据');
        }
        
        const parsed = JSON.parse(saved);
        if (!parsed.money || !parsed.stations) {
            throw new Error('存档数据格式不正确');
        }
    });
    
    test('存档索引正确维护', () => {
        const index = localStorageData['factory_game_saves'];
        if (!index) {
            throw new Error('应有存档索引');
        }
        
        const parsed = JSON.parse(index);
        if (!Array.isArray(parsed)) {
            throw new Error('存档索引应为数组');
        }
    });
    
    console.log('\n=== 端到端测试总结 ===');
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`总计: ${passed + failed}`);
    
    if (failed > 0) {
        console.log('\n失败的测试:');
        testResults.filter(r => !r.passed).forEach(r => {
            console.log(`  ✗ ${r.name}`);
            console.log(`    ${r.error}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 所有端到端测试通过！');
        process.exit(0);
    }
}

runTests().catch(e => {
    console.error('测试执行错误:', e);
    process.exit(1);
});
