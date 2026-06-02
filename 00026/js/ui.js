const UI = (function() {
    let notificationTimeout = null;
    let prevStationsHash = '';
    let prevOrdersHash = '';
    let prevInventoryHash = '';
    let prevEmployeesHash = '';
    let prevStats = { money: -1, income: -1, time: -1, output: -1, util: -1, failures: -1 };

    function init() {
        bindEvents();
    }

    function bindEvents() {
        document.getElementById('btn-pause').addEventListener('click', handlePauseToggle);
        
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => handleSpeedChange(parseInt(btn.dataset.speed)));
        });
        
        document.getElementById('btn-save').addEventListener('click', handleSave);
        document.getElementById('btn-load').addEventListener('click', showSaveModal);
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => handleTabChange(btn.dataset.tab));
        });
        
        document.getElementById('btn-new-order').addEventListener('click', () => Game.addNewOrder());
        document.getElementById('btn-refresh-market').addEventListener('click', () => Game.refreshEmployeeMarket());
        
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
            });
        });
        
        document.getElementById('btn-new-save').addEventListener('click', showNewSaveModal);
        document.getElementById('btn-create-save').addEventListener('click', handleCreateSave);
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    function handlePauseToggle() {
        const isPaused = Game.togglePause();
        const btn = document.getElementById('btn-pause');
        btn.innerHTML = isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
    }

    function handleSpeedChange(speed) {
        Game.setSpeed(speed);
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
        });
    }

    function handleSave() {
        if (Game.saveGame()) {
            showNotification('游戏已保存！', 'success');
        } else {
            showNotification('保存失败！', 'error');
        }
    }

    function handleTabChange(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabName}`);
        });
    }

    function showSaveModal() {
        const savesList = document.getElementById('saves-list');
        const saves = SaveSystem.getAllSaves();
        
        if (saves.length === 0) {
            savesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">暂无存档</p>';
        } else {
            savesList.innerHTML = saves.map(save => `
                <div class="save-card">
                    <div class="save-info">
                        <div class="save-name">${escapeHtml(save.name)}</div>
                        <div class="save-meta">
                            资金: ¥${formatNumber(save.money)} | 
                            游戏时间: ${SaveSystem.formatGameTime(save.gameTime)} | 
                            ${SaveSystem.formatDate(save.timestamp)}
                        </div>
                    </div>
                    <div class="save-actions">
                        <button class="btn-primary" onclick="handleLoadSave('${save.id}')">
                            <i class="fas fa-download"></i> 加载
                        </button>
                        <button class="btn-danger" onclick="handleDeleteSave('${save.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        document.getElementById('save-modal').classList.add('active');
    }

    function showNewSaveModal() {
        document.getElementById('save-modal').classList.remove('active');
        document.getElementById('new-save-modal').classList.add('active');
        document.getElementById('save-name-input').value = '';
        setTimeout(() => document.getElementById('save-name-input').focus(), 50);
    }

    function handleCreateSave() {
        const name = document.getElementById('save-name-input').value.trim() || '新工厂';
        if (Game.createNewGame(name)) {
            showNotification('新存档已创建！', 'success');
            document.getElementById('new-save-modal').classList.remove('active');
            showSaveModal();
        } else {
            showNotification('创建失败！', 'error');
        }
    }

    function handleLoadSave(saveId) {
        if (Game.loadGame(saveId)) {
            showNotification('存档已加载！', 'success');
            document.getElementById('save-modal').classList.remove('active');
            invalidateCaches();
        } else {
            showNotification('加载失败！', 'error');
        }
    }

    function handleDeleteSave(saveId) {
        if (confirm('确定要删除这个存档吗？此操作不可恢复。')) {
            SaveSystem.deleteSave(saveId);
            showSaveModal();
            showNotification('存档已删除', 'info');
        }
    }

    function handleDeliverOrder(orderId) {
        Game.deliverOrder(orderId);
        invalidateCaches();
    }

    function handleAssignEmployee(employeeId, stationId) {
        Game.assignEmployeeToStation(employeeId, stationId || null);
        invalidateCaches();
    }

    window.handleLoadSave = handleLoadSave;
    window.handleDeleteSave = handleDeleteSave;
    window.handleDeliverOrder = handleDeliverOrder;
    window.handleAssignEmployee = handleAssignEmployee;

    function invalidateCaches() {
        prevStationsHash = '';
        prevOrdersHash = '';
        prevInventoryHash = '';
        prevEmployeesHash = '';
        prevStats = { money: -1, income: -1, time: -1, output: -1, util: -1, failures: -1 };
    }

    function updateStats(gameState) {
        const hourlyOutput = Stats.getHourlyOutput(gameState);
        const utilization = Math.round(Stats.getAvgUtilization(gameState));
        const failures = gameState.failureCount || 0;
        const money = Math.round(gameState.money);
        const income = Math.round(gameState.totalIncome);
        const time = Math.floor(gameState.gameTime);

        if (prevStats.money !== money) {
            document.getElementById('money').textContent = '¥' + formatNumber(money);
            prevStats.money = money;
        }
        if (prevStats.income !== income) {
            document.getElementById('total-income').textContent = '¥' + formatNumber(income);
            prevStats.income = income;
        }
        if (prevStats.time !== time) {
            document.getElementById('game-time').textContent = formatTime(time);
            prevStats.time = time;
        }
        if (prevStats.output !== hourlyOutput) {
            document.getElementById('hourly-output').textContent = hourlyOutput;
            prevStats.output = hourlyOutput;
        }
        if (prevStats.util !== utilization) {
            document.getElementById('station-utilization').textContent = utilization + '%';
            prevStats.util = utilization;
        }
        if (prevStats.failures !== failures) {
            document.getElementById('failure-count').textContent = failures;
            prevStats.failures = failures;
        }
    }

    function updateStations(stations, employees) {
        const hash = stations.map(s => `${s.id}|${s.isWorking}|${s.isBroken}|${Math.floor(s.progress)}|${s.level}|${s.speedLevel}|${s.reliabilityLevel}|${s.assignedEmployee}`).join(';');
        if (hash === prevStationsHash) return;
        prevStationsHash = hash;

        const container = document.getElementById('stations-container');
        const list = document.getElementById('stations-list');

        container.innerHTML = stations.map(station => {
            let statusClass = 'idle';
            if (station.isBroken) statusClass = 'broken';
            else if (station.isWorking) statusClass = 'working';

            return `
                <div class="station-visual ${statusClass}" data-id="${station.id}">
                    <div class="status-indicator"></div>
                    <i class="fas ${station.icon}"></i>
                    <span class="name">${escapeHtml(station.name)}</span>
                    <div class="progress-ring">
                        <div class="progress-fill" style="width: ${station.progress}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        list.innerHTML = stations.map(station => {
            const costs = Stations.getUpgradeCost(station);
            const processTime = Stations.getActualProcessTime(station, employees);
            const failureRate = Stations.getActualFailureRate(station, employees);
            const assignedEmp = employees.find(e => e.id === station.assignedEmployee);

            return `
                <div class="station-card" data-id="${station.id}">
                    <div class="station-card-header">
                        <div class="name">
                            <i class="fas ${station.icon}"></i>
                            ${escapeHtml(station.name)}
                        </div>
                        <span class="level">Lv.${station.level}</span>
                    </div>
                    <div class="station-stats">
                        <div class="stat-row">
                            <span>处理时间:</span>
                            <span>${processTime.toFixed(1)}s</span>
                        </div>
                        <div class="stat-row">
                            <span>故障率:</span>
                            <span>${(failureRate * 100).toFixed(1)}%</span>
                        </div>
                        <div class="stat-row">
                            <span>速度等级:</span>
                            <span>${station.speedLevel}</span>
                        </div>
                        <div class="stat-row">
                            <span>可靠等级:</span>
                            <span>${station.reliabilityLevel}</span>
                        </div>
                        <div class="stat-row" style="grid-column: span 2;">
                            <span>员工:</span>
                            <span>${assignedEmp ? escapeHtml(assignedEmp.name) : '无'}</span>
                        </div>
                    </div>
                    <div class="station-actions">
                        ${station.isBroken ? `
                            <button class="btn-primary" onclick="Game.repairStation('${station.id}')">
                                <i class="fas fa-wrench"></i> 修复 ¥200
                            </button>
                        ` : `
                            <button class="btn-secondary" onclick="Game.upgradeStationSpeed('${station.id}')">
                                <i class="fas fa-tachometer-alt"></i> 速度 ¥${formatNumber(costs.speed)}
                            </button>
                            <button class="btn-secondary" onclick="Game.upgradeStationReliability('${station.id}')">
                                <i class="fas fa-shield-alt"></i> 可靠 ¥${formatNumber(costs.reliability)}
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateOrders(orders, gameTime, inventory) {
        const hash = orders.map(o => `${o.id}|${o.status}|${Math.floor(o.deadline - gameTime)}|${o.canDeliver}`).join(';') + 
                    '|' + Object.entries(inventory).map(([k,v]) => `${k}:${v}`).join(',');
        if (hash === prevOrdersHash) return;
        prevOrdersHash = hash;

        const container = document.getElementById('orders-list');

        if (orders.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">暂无订单，点击上方按钮生成新订单</p>';
            return;
        }

        container.innerHTML = orders.map(order => {
            const progress = Orders.getOrderProgress(order, inventory);
            const timeRemaining = Orders.getTimeRemaining(order, gameTime);
            const isUrgent = Orders.isUrgent(order, gameTime);

            return `
                <div class="order-card ${isUrgent ? 'urgent' : ''}" data-id="${order.id}">
                    <div class="order-header">
                        <span class="order-id">#${order.id.substr(-8)}</span>
                        <span class="order-reward">+¥${formatNumber(order.reward + order.bonus)}</span>
                    </div>
                    <div class="order-products">
                        ${order.products.map(req => {
                            const product = Orders.getProductInfo(req.productId);
                            const inStock = inventory[req.productId] || 0;
                            const isFulfilled = inStock >= req.count;
                            return `
                                <div class="product-requirement ${isFulfilled ? 'fulfilled' : ''}">
                                    <i class="fas ${product ? product.icon : 'fa-box'}"></i>
                                    <span>${product ? product.name : req.productId}: ${Math.min(inStock, req.count)}/${req.count}</span>
                                    ${isFulfilled ? '<i class="fas fa-check" style="margin-left: auto; color: var(--success-color);"></i>' : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="order-footer">
                        <span class="order-timer ${isUrgent ? 'urgent' : ''}">
                            <i class="fas fa-clock"></i> ${Orders.formatTime(timeRemaining)}
                        </span>
                        <div class="order-progress">
                            <div class="order-progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <button class="btn-primary" 
                            ${order.canDeliver ? '' : 'disabled'} 
                            style="padding: 6px 12px; font-size: 11px; flex: 0 0 auto; margin-left: 8px;"
                            onclick="handleDeliverOrder('${order.id}')">
                            <i class="fas fa-truck"></i> 交付
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateInventory(inventory, rawMaterials) {
        const hash = Object.entries(inventory).map(([k,v]) => `${k}:${v}`).join(';') + '|metal:' + rawMaterials.metal;
        if (hash === prevInventoryHash) return;
        prevInventoryHash = hash;

        document.getElementById('raw-metal').textContent = rawMaterials.metal || 0;

        const inventoryList = document.getElementById('inventory-list');
        inventoryList.innerHTML = Object.entries(inventory).map(([id, count]) => {
            const product = Orders.getProductInfo(id);
            if (!product) return '';
            const sellPrice = Math.floor(product.basePrice * 0.6);
            return `
                <div class="inventory-item">
                    <i class="fas ${product.icon}"></i>
                    <span>${product.name}: ${count}</span>
                    <button class="btn-secondary" 
                        style="padding: 3px 8px; font-size: 10px; margin-left: auto;"
                        ${count <= 0 ? 'disabled' : ''}
                        onclick="Game.sellProduct('${id}')">
                        <i class="fas fa-coins"></i> 售${sellPrice}
                    </button>
                </div>
            `;
        }).join('');
    }

    function updateEmployees(employees, stations) {
        const marketEmployees = Game.getMarketEmployees();
        const hash = employees.map(e => `${e.id}|${e.assignedStation}`).join(';') + 
                    '|' + marketEmployees.map(e => e.id).join(',');
        if (hash === prevEmployeesHash) return;
        prevEmployeesHash = hash;

        const myEmployeesContainer = document.getElementById('my-employees');
        const marketContainer = document.getElementById('employee-market');

        if (employees.length === 0) {
            myEmployeesContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">暂无员工，在下方雇佣市场招募</p>';
        } else {
            myEmployeesContainer.innerHTML = employees.map(emp => createEmployeeCard(emp, stations, true)).join('');
        }

        marketContainer.innerHTML = marketEmployees.map(emp => createEmployeeCard(emp, stations, false)).join('');
    }

    function createEmployeeCard(employee, stations, isHired) {
        const assignedStation = stations.find(s => s.id === employee.assignedStation);

        return `
            <div class="employee-card" data-id="${employee.id}">
                <div class="employee-header">
                    <div class="employee-avatar">${employee.avatar}</div>
                    <div class="employee-info">
                        <div class="employee-name">${escapeHtml(employee.name)}</div>
                        <div class="employee-salary">¥${employee.salary}/小时${assignedStation ? ` · ${escapeHtml(assignedStation.name)}` : ''}</div>
                    </div>
                </div>
                <div class="employee-skills">
                    <div class="skill-row">
                        <span class="skill-name">速度</span>
                        <div class="skill-bar">
                            <div class="skill-fill" style="width: ${employee.skills.speed}%"></div>
                        </div>
                        <span class="skill-value">${employee.skills.speed}</span>
                    </div>
                    <div class="skill-row">
                        <span class="skill-name">可靠</span>
                        <div class="skill-bar">
                            <div class="skill-fill" style="width: ${employee.skills.reliability}%"></div>
                        </div>
                        <span class="skill-value">${employee.skills.reliability}</span>
                    </div>
                    <div class="skill-row">
                        <span class="skill-name">质量</span>
                        <div class="skill-bar">
                            <div class="skill-fill" style="width: ${employee.skills.quality}%"></div>
                        </div>
                        <span class="skill-value">${employee.skills.quality}</span>
                    </div>
                </div>
                <div class="employee-actions">
                    ${isHired ? `
                        <select class="employee-assign" onchange="handleAssignEmployee('${employee.id}', this.value)">
                            <option value="">未分配</option>
                            ${stations.map(s => `
                                <option value="${s.id}" 
                                    ${s.id === employee.assignedStation ? 'selected' : ''}
                                    ${s.assignedEmployee && s.assignedEmployee !== employee.id ? 'disabled' : ''}>
                                    ${escapeHtml(s.name)} ${s.assignedEmployee && s.assignedEmployee !== employee.id ? '(已占用)' : ''}
                                </option>
                            `).join('')}
                        </select>
                        <button class="btn-danger" onclick="Game.fireEmployee('${employee.id}')" title="解雇">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    ` : `
                        <button class="btn-primary" onclick="Game.hireEmployee('${employee.id}')">
                            <i class="fas fa-user-plus"></i> 雇佣 ¥${employee.salary}
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    function showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
        }
        
        notification.innerHTML = message;
        notification.className = `notification show ${type}`;

        notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, 3500);
    }

    function formatNumber(num) {
        return Math.round(num).toLocaleString('zh-CN');
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        updateStats,
        updateStations,
        updateOrders,
        updateInventory,
        updateEmployees,
        showNotification,
        invalidateCaches
    };
})();

if (typeof window !== 'undefined') {
    window.UI = UI;
}
