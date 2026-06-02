const SaveSystem = (function() {
    const SAVE_PREFIX = 'factory_game_';
    const SAVES_INDEX = 'factory_game_saves';
    const MAX_SAVES = 10;

    function getSavesIndex() {
        try {
            const data = localStorage.getItem(SAVES_INDEX);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load saves index:', e);
            return [];
        }
    }

    function saveSavesIndex(index) {
        try {
            localStorage.setItem(SAVES_INDEX, JSON.stringify(index));
        } catch (e) {
            console.error('Failed to save saves index:', e);
        }
    }

    function generateId() {
        return 'save_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatGameTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}小时${m}分钟`;
    }

    function createNewSave(name) {
        const id = generateId();
        const initialState = {
            id: id,
            name: name || '新工厂',
            timestamp: Date.now(),
            gameTime: 0,
            money: 10000,
            totalIncome: 0,
            speed: 1,
            isPaused: true,
            stations: Stations.createInitialStations(),
            orders: [],
            employees: [],
            inventory: {
                product_a: 0,
                product_b: 0,
                product_c: 0
            },
            rawMaterials: {
                metal: 100
            },
            hourlyStats: [],
            failureCount: 0,
            productsProduced: 0,
            lastStatHour: 0
        };

        return saveGame(id, initialState);
    }

    function saveGame(saveId, gameState) {
        try {
            const saveData = {
                ...gameState,
                timestamp: Date.now()
            };

            localStorage.setItem(SAVE_PREFIX + saveId, JSON.stringify(saveData));

            let index = getSavesIndex();
            const existingIndex = index.findIndex(s => s.id === saveId);
            
            const saveInfo = {
                id: saveId,
                name: gameState.name,
                timestamp: saveData.timestamp,
                gameTime: gameState.gameTime,
                money: gameState.money
            };

            if (existingIndex >= 0) {
                index[existingIndex] = saveInfo;
            } else {
                index.unshift(saveInfo);
                if (index.length > MAX_SAVES) {
                    const removed = index.pop();
                    deleteSave(removed.id, false);
                }
            }

            saveSavesIndex(index);
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    function loadGame(saveId) {
        try {
            const data = localStorage.getItem(SAVE_PREFIX + saveId);
            if (!data) return null;
            const state = JSON.parse(data);
            
            state.inventory = state.inventory || { product_a: 0, product_b: 0, product_c: 0 };
            state.rawMaterials = state.rawMaterials || { metal: 100 };
            state.hourlyStats = state.hourlyStats || [];
            state.failureCount = state.failureCount || 0;
            state.productsProduced = state.productsProduced || 0;
            state.lastStatHour = state.lastStatHour || 0;
            state.employees = state.employees || [];
            state.orders = state.orders || [];
            
            if (state.hourlyProductCount === undefined) state.hourlyProductCount = 0;
            if (state.hourlyUtilizationSum === undefined) state.hourlyUtilizationSum = 0;
            if (state.hourlyUtilizationCount === undefined) state.hourlyUtilizationCount = 0;
            if (state.hourlyOrdersCompleted === undefined) state.hourlyOrdersCompleted = 0;
            if (state.hourlyFailures === undefined) state.hourlyFailures = 0;
            
            for (const station of (state.stations || [])) {
                if (station.speedLevel === undefined) station.speedLevel = 1;
                if (station.reliabilityLevel === undefined) station.reliabilityLevel = 1;
                if (station.assignedEmployee === undefined) station.assignedEmployee = null;
                if (station.output === undefined) {
                    const typeConfig = Stations.STATION_TYPES[station.type];
                    station.output = typeConfig ? typeConfig.output : 'product_a';
                }
            }
            
            for (const order of state.orders) {
                if (order.canDeliver === undefined) order.canDeliver = false;
            }
            
            for (const emp of state.employees) {
                if (emp.assignedStation === undefined) emp.assignedStation = null;
            }
            
            return state;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }

    function deleteSave(saveId, updateIndex = true) {
        try {
            localStorage.removeItem(SAVE_PREFIX + saveId);
            
            if (updateIndex) {
                let index = getSavesIndex();
                index = index.filter(s => s.id !== saveId);
                saveSavesIndex(index);
            }
            return true;
        } catch (e) {
            console.error('Failed to delete save:', e);
            return false;
        }
    }

    function getAllSaves() {
        return getSavesIndex();
    }

    function autoSave(gameState) {
        if (gameState && gameState.id) {
            return saveGame(gameState.id, gameState);
        }
        return false;
    }

    return {
        createNewSave,
        saveGame,
        loadGame,
        deleteSave,
        getAllSaves,
        autoSave,
        formatDate,
        formatGameTime
    };
})();

if (typeof window !== 'undefined') {
    window.SaveSystem = SaveSystem;
    window.Save = SaveSystem;
}
