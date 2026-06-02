const Employees = (function() {
    const EMPLOYEE_NAMES = [
        '张三', '李四', '王五', '赵六', '陈七', '周八', '吴九', '郑十',
        '孙明', '钱华', '林伟', '黄强', '杨军', '刘芳', '徐丽', '朱杰'
    ];

    const EMPLOYEE_AVATARS = [
        '👨‍🔧', '👩‍🔧', '👨‍💼', '👩‍💼', '👨‍🏭', '👩‍🏭', '🧑‍🔬', '👨‍🎓',
        '👩‍🎓', '🧑‍💻', '👨‍🔬', '👩‍🔬', '🧑‍🏫', '👨‍🍳', '👩‍🍳', '🧑‍🎨'
    ];

    const REFRESH_COST = 500;

    let marketEmployees = [];

    function generateId() {
        return 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function randomSkill(min = 20, max = 80) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function calculateSalary(skills) {
        const avgSkill = (skills.speed + skills.reliability + skills.quality) / 3;
        return Math.floor(100 + avgSkill * 5);
    }

    function generateEmployee() {
        const skills = {
            speed: randomSkill(),
            reliability: randomSkill(),
            quality: randomSkill()
        };

        return {
            id: generateId(),
            name: EMPLOYEE_NAMES[Math.floor(Math.random() * EMPLOYEE_NAMES.length)],
            avatar: EMPLOYEE_AVATARS[Math.floor(Math.random() * EMPLOYEE_AVATARS.length)],
            skills: skills,
            salary: calculateSalary(skills),
            assignedStation: null
        };
    }

    function generateMarketEmployees(count = 5) {
        marketEmployees = [];
        for (let i = 0; i < count; i++) {
            marketEmployees.push(generateEmployee());
        }
        return marketEmployees;
    }

    function getMarketEmployees() {
        return marketEmployees;
    }

    function hireEmployee(employeeId, currentMoney) {
        const index = marketEmployees.findIndex(e => e.id === employeeId);
        if (index === -1) return null;

        const employee = marketEmployees[index];
        if (currentMoney < employee.salary) {
            return { success: false, message: '资金不足' };
        }

        marketEmployees.splice(index, 1);
        return {
            success: true,
            employee: employee,
            cost: employee.salary
        };
    }

    function fireEmployee(employees, employeeId, stations) {
        const index = employees.findIndex(e => e.id === employeeId);
        if (index === -1) return false;

        const employee = employees[index];
        if (employee.assignedStation) {
            const station = stations.find(s => s.id === employee.assignedStation);
            if (station) {
                station.assignedEmployee = null;
            }
        }

        employees.splice(index, 1);
        return true;
    }

    function assignToStation(employee, stationId, stations) {
        if (employee.assignedStation) {
            const oldStation = stations.find(s => s.id === employee.assignedStation);
            if (oldStation) {
                oldStation.assignedEmployee = null;
            }
        }

        const newStation = stations.find(s => s.id === stationId);
        if (newStation) {
            if (newStation.assignedEmployee) {
                return { success: false, message: '该工位已有员工' };
            }
            newStation.assignedEmployee = employee.id;
            employee.assignedStation = stationId;
            return { success: true };
        }

        return { success: false, message: '工位不存在' };
    }

    function unassignFromStation(employee, stations) {
        if (employee.assignedStation) {
            const station = stations.find(s => s.id === employee.assignedStation);
            if (station) {
                station.assignedEmployee = null;
            }
            employee.assignedStation = null;
            return true;
        }
        return false;
    }

    function calculateTotalSalary(employees) {
        return employees.reduce((total, e) => total + e.salary, 0);
    }

    function getRefreshCost() {
        return REFRESH_COST;
    }

    return {
        generateMarketEmployees,
        getMarketEmployees,
        hireEmployee,
        fireEmployee,
        assignToStation,
        unassignFromStation,
        calculateTotalSalary,
        getRefreshCost
    };
})();

if (typeof window !== 'undefined') {
    window.Employees = Employees;
}
