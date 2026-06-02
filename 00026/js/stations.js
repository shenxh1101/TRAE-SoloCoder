const Stations = (function() {
    const STATION_TYPES = {
        cutter: {
            name: '切割机',
            icon: 'fa-cut',
            baseProcessTime: 5,
            baseFailureRate: 0.05,
            output: 'product_a'
        },
        assembler: {
            name: '组装机',
            icon: 'fa-cogs',
            baseProcessTime: 8,
            baseFailureRate: 0.08,
            output: 'product_a'
        },
        painter: {
            name: '喷涂机',
            icon: 'fa-paint-roller',
            baseProcessTime: 6,
            baseFailureRate: 0.06,
            output: 'product_b'
        },
        packer: {
            name: '包装机',
            icon: 'fa-box',
            baseProcessTime: 4,
            baseFailureRate: 0.03,
            output: 'product_c'
        }
    };

    const UPGRADE_COSTS = {
        speed: (level) => Math.floor(500 * Math.pow(1.5, level)),
        reliability: (level) => Math.floor(800 * Math.pow(1.5, level))
    };

    function generateId() {
        return 'station_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function createInitialStations() {
        return [
            createStation('cutter', '切割机 1'),
            createStation('assembler', '组装机 1'),
            createStation('painter', '喷涂机 1'),
            createStation('packer', '包装机 1')
        ];
    }

    function createStation(type, name) {
        const config = STATION_TYPES[type];
        return {
            id: generateId(),
            name: name || config.name,
            type: type,
            icon: config.icon,
            processTime: config.baseProcessTime,
            baseProcessTime: config.baseProcessTime,
            failureRate: config.baseFailureRate,
            baseFailureRate: config.baseFailureRate,
            level: 1,
            speedLevel: 1,
            reliabilityLevel: 1,
            isWorking: false,
            isBroken: false,
            progress: 0,
            assignedEmployee: null,
            currentItem: null,
            output: config.output
        };
    }

    function getActualProcessTime(station, employees) {
        let time = station.baseProcessTime;
        let speedBonus = 1 + (station.speedLevel - 1) * 0.1;

        if (station.assignedEmployee) {
            const employee = employees.find(e => e.id === station.assignedEmployee);
            if (employee) {
                speedBonus += employee.skills.speed / 200;
            }
        }

        return time / speedBonus;
    }

    function getActualFailureRate(station, employees) {
        let rate = station.baseFailureRate;
        let reliabilityBonus = 1 - (station.reliabilityLevel - 1) * 0.05;

        if (station.assignedEmployee) {
            const employee = employees.find(e => e.id === station.assignedEmployee);
            if (employee) {
                reliabilityBonus *= (1 - employee.skills.reliability / 200);
            }
        }

        return Math.max(0.005, rate * reliabilityBonus);
    }

    function updateStation(station, deltaTime, employees) {
        if (station.isBroken || !station.isWorking) {
            return null;
        }

        const processTime = getActualProcessTime(station, employees);
        station.progress += (deltaTime / processTime) * 100;

        if (station.progress >= 100) {
            station.progress = 0;
            station.isWorking = false;
            
            const failureRate = getActualFailureRate(station, employees);
            if (Math.random() < failureRate) {
                station.isBroken = true;
                return { type: 'failure', station: station };
            }

            return { type: 'complete', station: station, output: station.output };
        }

        return null;
    }

    function startProcessing(station) {
        if (!station.isBroken && !station.isWorking) {
            station.isWorking = true;
            station.progress = 0;
            return true;
        }
        return false;
    }

    function repairStation(station) {
        if (station.isBroken) {
            station.isBroken = false;
            station.progress = 0;
            return true;
        }
        return false;
    }

    function upgradeSpeed(station, money) {
        const cost = UPGRADE_COSTS.speed(station.speedLevel);
        if (money >= cost) {
            station.speedLevel++;
            station.level = Math.floor((station.speedLevel + station.reliabilityLevel) / 2);
            return { success: true, cost: cost };
        }
        return { success: false, cost: cost };
    }

    function upgradeReliability(station, money) {
        const cost = UPGRADE_COSTS.reliability(station.reliabilityLevel);
        if (money >= cost) {
            station.reliabilityLevel++;
            station.level = Math.floor((station.speedLevel + station.reliabilityLevel) / 2);
            return { success: true, cost: cost };
        }
        return { success: false, cost: cost };
    }

    function getUpgradeCost(station) {
        return {
            speed: UPGRADE_COSTS.speed(station.speedLevel),
            reliability: UPGRADE_COSTS.reliability(station.reliabilityLevel)
        };
    }

    function assignEmployee(station, employeeId) {
        station.assignedEmployee = employeeId;
    }

    function unassignEmployee(station) {
        station.assignedEmployee = null;
    }

    function getUtilization(stations) {
        if (stations.length === 0) return 0;
        const working = stations.filter(s => s.isWorking && !s.isBroken).length;
        return (working / stations.length) * 100;
    }

    return {
        createInitialStations,
        createStation,
        updateStation,
        startProcessing,
        repairStation,
        upgradeSpeed,
        upgradeReliability,
        getUpgradeCost,
        getActualProcessTime,
        getActualFailureRate,
        assignEmployee,
        unassignEmployee,
        getUtilization,
        STATION_TYPES
    };
})();

if (typeof window !== 'undefined') {
    window.Stations = Stations;
}
