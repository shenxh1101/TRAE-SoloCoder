const Game = (function() {
    let gameState = null;
    let lastTime = 0;
    let animationId = null;
    let autoSaveTimer = null;
    let salaryTimer = 0;
    let renderThrottle = 0;
    const RENDER_INTERVAL = 100;
    const METAL_COST = 50;
    const METAL_AMOUNT = 50;

    function init() {
        const saves = SaveSystem.getAllSaves();
        
        if (saves.length > 0) {
            gameState = SaveSystem.loadGame(saves[0].id);
        }
        
        if (!gameState) {
            createNewGame('默认工厂');
        }

        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) {
            pauseBtn.innerHTML = gameState.isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        }
        
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.speed) === gameState.speed);
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === 'stations');
        });
        
        UI.invalidateCaches();
        render();
        
        Employees.generateMarketEmployees();
        startGameLoop();
        startAutoSave();
    }

    function createNewGame(name) {
        const success = SaveSystem.createNewSave(name);
        if (success) {
            const saves = SaveSystem.getAllSaves();
            gameState = SaveSystem.loadGame(saves[0].id);
            return true;
        }
        return false;
    }

    function loadGame(saveId) {
        const loaded = SaveSystem.loadGame(saveId);
        if (loaded) {
            gameState = loaded;
            salaryTimer = 0;
            
            const btn = document.getElementById('btn-pause');
            if (btn) btn.innerHTML = gameState.isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
            
            document.querySelectorAll('.speed-btn').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.speed) === gameState.speed);
            });
            
            return true;
        }
        return false;
    }

    function saveGame() {
        if (gameState) {
            return SaveSystem.saveGame(gameState.id, gameState);
        }
        return false;
    }

    function startGameLoop() {
        lastTime = performance.now();
        gameLoop();
    }

    function gameLoop() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        if (!gameState.isPaused) {
            update(Math.min(deltaTime, 0.1) * gameState.speed);
        }

        renderThrottle += deltaTime * 1000;
        if (renderThrottle >= RENDER_INTERVAL) {
            renderThrottle = 0;
            render();
        }

        animationId = requestAnimationFrame(gameLoop);
    }

    function update(deltaTime) {
        gameState.gameTime += deltaTime;

        updateStations(deltaTime);
        updateOrders();
        updateStats(deltaTime);
        paySalaries(deltaTime);
        autoGenerateOrders();
    }

    function updateStations(deltaTime) {
        for (const station of gameState.stations) {
            if (!station.isWorking && !station.isBroken) {
                if (gameState.rawMaterials.metal > 0) {
                    station.isWorking = true;
                    station.progress = 0;
                    gameState.rawMaterials.metal--;
                }
            }

            const result = Stations.updateStation(station, deltaTime, gameState.employees);
            
            if (result) {
                if (result.type === 'complete') {
                    if (gameState.inventory[result.output] !== undefined) {
                        gameState.inventory[result.output]++;
                        Stats.recordProduct(gameState);
                    }
                } else if (result.type === 'failure') {
                    Stats.recordFailure(gameState);
                    UI.showNotification(`${station.name} 发生故障！`, 'warning');
                }
            }
        }
    }

    function updateOrders() {
        const results = Orders.updateOrders(gameState.orders, gameState.gameTime, gameState.inventory);
        
        for (const result of results) {
            if (result.type === 'failed') {
                UI.showNotification(`订单 ${result.order.id.substr(0, 8)} 超时失败！`, 'error');
            }
        }

        for (const order of gameState.orders) {
            if (order.status === 'pending') {
                order.canDeliver = Orders.checkOrderFulfillment(order, gameState.inventory);
            }
        }

        gameState.orders = gameState.orders.filter(o => o.status === 'pending');
    }

    function updateStats(deltaTime) {
        const utilization = Stations.getUtilization(gameState.stations);
        Stats.updateRealtimeStats(gameState, utilization);
        Stats.recordHourlyStats(gameState);
    }

    function paySalaries(deltaTime) {
        salaryTimer += deltaTime;
        
        if (salaryTimer >= 3600) {
            salaryTimer -= 3600;
            const totalSalary = Employees.calculateTotalSalary(gameState.employees);
            if (totalSalary > 0) {
                gameState.money -= totalSalary;
                UI.showNotification(`支付员工工资：-¥${totalSalary}`, 'info');
            }
        }
    }

    function autoGenerateOrders() {
        if (gameState.orders.length < 5 && Math.random() < 0.001) {
            gameState.orders.push(Orders.generateRandomOrder(gameState.gameTime));
            UI.showNotification('收到新订单！', 'info');
        }
    }

    function render() {
        UI.updateStats(gameState);
        UI.updateStations(gameState.stations, gameState.employees);
        UI.updateOrders(gameState.orders, gameState.gameTime, gameState.inventory);
        UI.updateInventory(gameState.inventory, gameState.rawMaterials);
        UI.updateEmployees(gameState.employees, gameState.stations);
        
        const canvas = document.getElementById('efficiency-chart');
        if (canvas) {
            Stats.drawEfficiencyChart(canvas, gameState.hourlyStats);
        }
    }

    function startAutoSave() {
        autoSaveTimer = setInterval(() => {
            if (gameState) {
                SaveSystem.autoSave(gameState);
            }
        }, 30000);
    }

    function togglePause() {
        if (gameState) {
            gameState.isPaused = !gameState.isPaused;
            return gameState.isPaused;
        }
        return false;
    }

    function setSpeed(speed) {
        if (gameState && [1, 2, 4, 8].includes(speed)) {
            gameState.speed = speed;
            return true;
        }
        return false;
    }

    function upgradeStationSpeed(stationId) {
        const station = gameState.stations.find(s => s.id === stationId);
        if (station) {
            const result = Stations.upgradeSpeed(station, gameState.money);
            if (result.success) {
                gameState.money -= result.cost;
                UI.showNotification(`${station.name} 速度升级至 Lv.${station.speedLevel}！`, 'success');
            } else {
                UI.showNotification(`升级需要 ¥${result.cost}，资金不足`, 'error');
            }
            return result;
        }
        return { success: false };
    }

    function upgradeStationReliability(stationId) {
        const station = gameState.stations.find(s => s.id === stationId);
        if (station) {
            const result = Stations.upgradeReliability(station, gameState.money);
            if (result.success) {
                gameState.money -= result.cost;
                UI.showNotification(`${station.name} 可靠性升级至 Lv.${station.reliabilityLevel}！`, 'success');
            } else {
                UI.showNotification(`升级需要 ¥${result.cost}，资金不足`, 'error');
            }
            return result;
        }
        return { success: false };
    }

    function repairStation(stationId) {
        const station = gameState.stations.find(s => s.id === stationId);
        if (station && station.isBroken) {
            const cost = 200;
            if (gameState.money >= cost) {
                gameState.money -= cost;
                Stations.repairStation(station);
                UI.showNotification(`${station.name} 已修复！(-¥${cost})`, 'success');
                return true;
            } else {
                UI.showNotification(`修复需要 ¥${cost}，资金不足`, 'error');
                return false;
            }
        }
        return false;
    }

    function hireEmployee(employeeId) {
        const result = Employees.hireEmployee(employeeId, gameState.money);
        if (result && result.success) {
            gameState.employees.push(result.employee);
            gameState.money -= result.cost;
            UI.showNotification(`成功雇佣 ${result.employee.name}！(-¥${result.cost})`, 'success');
            return true;
        } else if (result) {
            UI.showNotification(result.message || '雇佣失败', 'error');
        }
        return false;
    }

    function fireEmployee(employeeId) {
        const employee = gameState.employees.find(e => e.id === employeeId);
        if (employee) {
            Employees.fireEmployee(gameState.employees, employeeId, gameState.stations);
            UI.showNotification(`已解雇 ${employee.name}`, 'info');
            return true;
        }
        return false;
    }

    function assignEmployeeToStation(employeeId, stationId) {
        const employee = gameState.employees.find(e => e.id === employeeId);
        if (!employee) return false;

        if (!stationId) {
            Employees.unassignFromStation(employee, gameState.stations);
            UI.showNotification(`${employee.name} 已从工位撤下`, 'info');
            return true;
        }

        const result = Employees.assignToStation(employee, stationId, gameState.stations);
        if (result.success) {
            UI.showNotification(`${employee.name} 已分配到工位`, 'success');
        } else {
            UI.showNotification(result.message, 'error');
        }
        return result.success;
    }

    function refreshEmployeeMarket() {
        const cost = Employees.getRefreshCost();
        if (gameState.money >= cost) {
            gameState.money -= cost;
            Employees.generateMarketEmployees();
            UI.showNotification('雇佣市场已刷新！', 'success');
            return true;
        } else {
            UI.showNotification(`刷新需要 ¥${cost}，资金不足`, 'error');
            return false;
        }
    }

    function addNewOrder() {
        if (gameState.orders.length < 10) {
            gameState.orders.push(Orders.generateRandomOrder(gameState.gameTime));
            UI.showNotification('已生成新订单！', 'info');
            return true;
        }
        UI.showNotification('订单数量已达上限', 'warning');
        return false;
    }

    function deliverOrder(orderId) {
        const order = gameState.orders.find(o => o.id === orderId);
        if (!order || order.status !== 'pending') return false;

        if (!Orders.checkOrderFulfillment(order, gameState.inventory)) {
            UI.showNotification('库存不足，无法交付', 'error');
            return false;
        }

        const result = Orders.fulfillOrder(order, gameState.inventory, gameState.gameTime);
        if (result.success) {
            gameState.money += result.reward;
            gameState.totalIncome += result.reward;
            Stats.recordOrder(gameState);
            
            gameState.orders = gameState.orders.filter(o => o.status === 'pending');
            
            let message = `订单完成！获得 ¥${result.reward}`;
            if (result.bonus > 0) {
                message += ` (含按时奖励 ¥${result.bonus})`;
            }
            UI.showNotification(message, 'success');
            return true;
        }
        return false;
    }

    function buyMetal() {
        if (gameState.money >= METAL_COST) {
            gameState.money -= METAL_COST;
            gameState.rawMaterials.metal += METAL_AMOUNT;
            UI.showNotification(`购入 ${METAL_AMOUNT} 金属块 (-¥${METAL_COST})`, 'success');
            return true;
        } else {
            UI.showNotification(`购买需要 ¥${METAL_COST}，资金不足`, 'error');
            return false;
        }
    }

    function sellProduct(productId) {
        const product = Orders.getProductInfo(productId);
        if (!product) return false;
        
        const count = gameState.inventory[productId] || 0;
        if (count <= 0) {
            UI.showNotification('没有可销售的产品', 'error');
            return false;
        }

        const sellCount = Math.min(count, 10);
        const sellPrice = Math.floor(product.basePrice * 0.6);
        const totalEarn = sellCount * sellPrice;
        
        gameState.inventory[productId] -= sellCount;
        gameState.money += totalEarn;
        gameState.totalIncome += totalEarn;
        UI.showNotification(`售出 ${product.name} x${sellCount}，获得 ¥${totalEarn}`, 'success');
        return true;
    }

    function getState() {
        return gameState;
    }

    function getMarketEmployees() {
        return Employees.getMarketEmployees();
    }

    return {
        init,
        createNewGame,
        loadGame,
        saveGame,
        togglePause,
        setSpeed,
        upgradeStationSpeed,
        upgradeStationReliability,
        repairStation,
        hireEmployee,
        fireEmployee,
        assignEmployeeToStation,
        refreshEmployeeMarket,
        addNewOrder,
        deliverOrder,
        buyMetal,
        sellProduct,
        getState,
        getMarketEmployees
    };
})();

if (typeof window !== 'undefined') {
    window.Game = Game;
}
