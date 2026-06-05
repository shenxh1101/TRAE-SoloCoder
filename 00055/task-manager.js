const TASK_STATUS = {
    PENDING: 'pending',
    PARSING: 'parsing',
    TRACING: 'tracing',
    CALCULATING: 'calculating',
    OPTIMIZING: 'optimizing',
    COMPLETED: 'completed',
    ERROR: 'error',
    PAUSED: 'paused'
};

const STATUS_LABELS = {
    [TASK_STATUS.PENDING]: '待解析',
    [TASK_STATUS.PARSING]: '解析中',
    [TASK_STATUS.TRACING]: '光线追迹中',
    [TASK_STATUS.CALCULATING]: '像差计算中',
    [TASK_STATUS.OPTIMIZING]: '优化迭代中',
    [TASK_STATUS.COMPLETED]: '完成',
    [TASK_STATUS.ERROR]: '异常',
    [TASK_STATUS.PAUSED]: '已暂停'
};

class DesignTask {
    constructor(id, name, lensData) {
        this.id = id;
        this.name = name;
        this.lensData = lensData;
        this.originalLensData = JSON.parse(JSON.stringify(lensData));
        this.status = TASK_STATUS.PENDING;
        this.progress = 0;
        this.createdAt = new Date();
        this.startedAt = null;
        this.completedAt = null;
        this.analysisResults = null;
        this.optimizationHistory = [];
        this.iterations = 0;
        this.maxIterations = 20;
        this.consecutiveNonConverging = 0;
        this.warnings = [];
        this.rmsThreshold = 0.07;
        this.mtfThreshold = 50;
        this.adminEmail = 'admin@optical.com';
        this.qualityScore = 0;
        this.meetsRequirements = false;
    }

    updateStatus(newStatus, progress = null) {
        this.status = newStatus;
        if (progress !== null) {
            this.progress = Math.min(100, Math.max(0, progress));
        }
        
        if (newStatus === TASK_STATUS.PENDING && !this.startedAt) {
            this.startedAt = new Date();
        }
        
        if (newStatus === TASK_STATUS.COMPLETED || newStatus === TASK_STATUS.ERROR) {
            this.completedAt = new Date();
        }
        
        return this;
    }

    addOptimizationStep(step) {
        this.optimizationHistory.push({
            ...step,
            timestamp: new Date()
        });
        this.iterations++;
    }

    addWarning(message, type = 'warning') {
        this.warnings.push({
            message,
            type,
            timestamp: new Date()
        });
    }

    getDuration() {
        const end = this.completedAt || new Date();
        return end - (this.startedAt || this.createdAt);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            status: this.status,
            progress: this.progress,
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            iterations: this.iterations,
            qualityScore: this.qualityScore,
            meetsRequirements: this.meetsRequirements
        };
    }
}

class TaskManager {
    constructor() {
        this.tasks = new Map();
        this.currentTaskId = null;
        this.selectedTaskId = null;
        this.taskCounter = 0;
        this.listeners = new Map();
        this.dailyStats = this.loadDailyStats();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }

    createTask(name, lensData) {
        const id = `task_${++this.taskCounter}_${Date.now()}`;
        const task = new DesignTask(id, name || `设计任务 ${this.taskCounter}`, lensData);
        this.tasks.set(id, task);
        this.emit('taskCreated', task);
        this.updateDailyStats('created');
        return task;
    }

    getTask(id) {
        return this.tasks.get(id);
    }

    getAllTasks() {
        return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    deleteTask(id) {
        const task = this.tasks.get(id);
        if (task) {
            this.tasks.delete(id);
            this.emit('taskDeleted', id);
            return true;
        }
        return false;
    }

    selectTask(id) {
        this.selectedTaskId = id;
        this.emit('taskSelected', id);
    }

    getSelectedTask() {
        return this.selectedTaskId ? this.tasks.get(this.selectedTaskId) : null;
    }

    async startTask(id, options = {}) {
        const task = this.tasks.get(id);
        if (!task) throw new Error('任务不存在');

        task.maxIterations = options.maxIterations || 20;
        task.rmsThreshold = options.rmsThreshold || 0.07;
        task.mtfThreshold = options.mtfThreshold || 50;
        task.adminEmail = options.adminEmail || 'admin@optical.com';
        task.startedAt = new Date();

        this.currentTaskId = id;
        this.emit('taskStarted', task);

        try {
            await this.executeTask(task);
        } catch (error) {
            task.updateStatus(TASK_STATUS.ERROR, 100);
            task.addWarning(`执行错误: ${error.message}`, 'error');
            this.emit('taskError', { task, error });
            this.updateDailyStats('errors');
        }

        return task;
    }

    async executeTask(task) {
        task.updateStatus(TASK_STATUS.PARSING, 10);
        this.emit('taskProgress', task);
        await this.delay(300);

        const system = new OpticalSystem();
        system.loadFromData(task.lensData);

        task.updateStatus(TASK_STATUS.TRACING, 25);
        this.emit('taskProgress', task);
        await this.delay(500);

        const spotResults = {};
        system.fieldAngles.forEach(angle => {
            spotResults[angle] = system.calculateSpotSize(angle);
        });

        task.updateStatus(TASK_STATUS.CALCULATING, 50);
        this.emit('taskProgress', task);
        await this.delay(400);

        const analysis = system.calculateFullAnalysis();
        task.analysisResults = analysis;

        const initialQuality = this.evaluateQuality(analysis, task);
        task.qualityScore = initialQuality.score;
        task.meetsRequirements = initialQuality.meets;

        if (!initialQuality.meets) {
            task.updateStatus(TASK_STATUS.OPTIMIZING, 60);
            this.emit('taskProgress', task);

            const optimizer = new Optimizer(system, task);
            const success = await optimizer.optimize(task.lensData, {
                maxIterations: task.maxIterations,
                rmsThreshold: task.rmsThreshold,
                mtfThreshold: task.mtfThreshold
            });

            if (success) {
                task.analysisResults = system.calculateFullAnalysis();
                const finalQuality = this.evaluateQuality(task.analysisResults, task);
                task.qualityScore = finalQuality.score;
                task.meetsRequirements = finalQuality.meets;
            }

            if (task.consecutiveNonConverging >= 3) {
                task.updateStatus(TASK_STATUS.PAUSED, 90);
                this.emit('taskPaused', task);
                this.emit('warning', {
                    task,
                    message: '连续三次优化不收敛，任务已暂停',
                    type: 'convergence'
                });
                this.updateDailyStats('warnings');
                return;
            }
        }

        task.updateStatus(TASK_STATUS.COMPLETED, 100);
        this.emit('taskCompleted', task);
        this.updateDailyStats('completed');
        
        if (task.meetsRequirements) {
            this.updateDailyStats('qualityPassed');
        }
    }

    evaluateQuality(analysis, task) {
        const rmsScore = Math.max(0, 100 - (analysis.overall.avgRmsWavefront / task.rmsThreshold) * 50);
        const mtfScore = Math.min(100, (analysis.overall.avgMTFCutoff / task.mtfThreshold) * 100);
        const spotScore = Math.max(0, 100 - analysis.overall.avgRmsSpot * 10);
        
        const score = Math.round((rmsScore * 0.4 + mtfScore * 0.4 + spotScore * 0.2));
        
        const meets = analysis.overall.avgRmsWavefront <= task.rmsThreshold &&
                      analysis.overall.avgMTFCutoff >= task.mtfThreshold;
        
        return { score: Math.min(100, Math.max(0, score)), meets };
    }

    pauseTask(id) {
        const task = this.tasks.get(id);
        if (task && task.status === TASK_STATUS.OPTIMIZING) {
            task.updateStatus(TASK_STATUS.PAUSED);
            this.emit('taskPaused', task);
            return true;
        }
        return false;
    }

    resumeTask(id) {
        const task = this.tasks.get(id);
        if (task && task.status === TASK_STATUS.PAUSED) {
            task.consecutiveNonConverging = 0;
            this.startTask(id, {
                maxIterations: task.maxIterations,
                rmsThreshold: task.rmsThreshold,
                mtfThreshold: task.mtfThreshold
            });
            return true;
        }
        return false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadDailyStats() {
        try {
            const saved = localStorage.getItem('optics_daily_stats');
            if (saved) {
                const stats = JSON.parse(saved);
                const today = new Date().toDateString();
                if (stats.date !== today) {
                    return this.createNewDailyStats();
                }
                return stats;
            }
        } catch (e) {
            console.error('加载统计数据失败:', e);
        }
        return this.createNewDailyStats();
    }

    createNewDailyStats() {
        return {
            date: new Date().toDateString(),
            created: 0,
            completed: 0,
            errors: 0,
            warnings: 0,
            qualityPassed: 0,
            totalIterations: 0,
            aberrationTypes: {
                spherical: 0,
                coma: 0,
                astigmatism: 0,
                fieldCurvature: 0,
                distortion: 0
            }
        };
    }

    updateDailyStats(type, value = 1) {
        if (type === 'aberration') {
            this.dailyStats.aberrationTypes[value] = (this.dailyStats.aberrationTypes[value] || 0) + 1;
        } else if (type === 'iterations') {
            this.dailyStats.totalIterations += value;
        } else {
            this.dailyStats[type] = (this.dailyStats[type] || 0) + value;
        }
        this.saveDailyStats();
    }

    saveDailyStats() {
        localStorage.setItem('optics_daily_stats', JSON.stringify(this.dailyStats));
    }

    getPerformanceMetrics() {
        const tasks = this.getAllTasks();
        const completedTasks = tasks.filter(t => t.status === TASK_STATUS.COMPLETED);
        
        const completionRate = tasks.length > 0 
            ? Math.round((completedTasks.length / tasks.length) * 100) 
            : 0;
        
        const avgIterations = completedTasks.length > 0
            ? Math.round(completedTasks.reduce((a, b) => a + b.iterations, 0) / completedTasks.length * 10) / 10
            : 0;
        
        const qualityPassed = completedTasks.filter(t => t.meetsRequirements).length;
        const qualityRate = completedTasks.length > 0
            ? Math.round((qualityPassed / completedTasks.length) * 100)
            : 0;
        
        const warningCount = tasks.reduce((a, b) => a + b.warnings.length, 0);
        
        return {
            completionRate,
            avgIterations,
            qualityRate,
            warningCount,
            daily: this.dailyStats
        };
    }
}

const taskManager = new TaskManager();
