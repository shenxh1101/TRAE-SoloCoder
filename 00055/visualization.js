class OpticalVisualization {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#2563eb',
            secondary: '#64748b',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            purple: '#8b5cf6',
            cyan: '#06b6d4'
        };
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }

    renderSpotDiagram(canvasId, spotData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const datasets = [];
        const fieldColors = [this.colors.primary, this.colors.warning, this.colors.danger];
        const fieldNames = ['轴上', '0.7视场', '全视场'];

        Object.keys(spotData).forEach((angle, index) => {
            const data = spotData[angle];
            if (data && data.rays) {
                datasets.push({
                    label: `${fieldNames[index] || angle}°`,
                    data: data.rays.map(r => ({ x: r.x, y: r.y })),
                    backgroundColor: fieldColors[index % fieldColors.length],
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    showLine: false
                });
            }
        });

        this.charts[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `(${ctx.parsed.x.toFixed(3)}, ${ctx.parsed.y.toFixed(3)}) µm`
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'center',
                        title: { display: true, text: 'X (µm)' },
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    },
                    y: {
                        type: 'linear',
                        title: { display: true, text: 'Y (µm)' },
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    renderWavefront(canvasId, wavefrontData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || !wavefrontData || !wavefrontData.data) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const validData = wavefrontData.data.filter(d => d.valid);
        
        const heatmapData = validData.map(d => ({
            x: d.x,
            y: d.y,
            v: d.opd
        }));

        const datasets = [{
            label: 'OPD (λ)',
            data: heatmapData.map(d => ({ x: d.x, y: d.y })),
            backgroundColor: heatmapData.map(d => this.getOpdColor(d.v)),
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false
        }];

        this.charts[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `RMS: ${wavefrontData.rms.toFixed(4)}λ, PV: ${wavefrontData.peakToValley.toFixed(4)}λ`
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const point = heatmapData[ctx.dataIndex];
                                return `OPD: ${point.v.toFixed(4)}λ`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: -1.1,
                        max: 1.1,
                        title: { display: true, text: '归一化光瞳 X' }
                    },
                    y: {
                        type: 'linear',
                        min: -1.1,
                        max: 1.1,
                        title: { display: true, text: '归一化光瞳 Y' }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    getOpdColor(opd) {
        const maxOpd = 0.5;
        const normalized = Math.max(-1, Math.min(1, opd / maxOpd));
        const hue = (1 - (normalized + 1) / 2) * 240;
        return `hsla(${hue}, 70%, 50%, 0.8)`;
    }

    renderMTF(canvasId, mtfData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const datasets = [];
        const fieldColors = [this.colors.primary, this.colors.warning, this.colors.danger];
        const fieldNames = ['轴上', '0.7视场', '全视场'];

        Object.keys(mtfData).forEach((angle, index) => {
            const data = mtfData[angle];
            if (data && data.data) {
                datasets.push({
                    label: `${fieldNames[index] || angle}°`,
                    data: data.data.map(d => ({ x: d.frequency, y: d.mtf * 100 })),
                    borderColor: fieldColors[index % fieldColors.length],
                    backgroundColor: fieldColors[index % fieldColors.length] + '33',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                });
            }
        });

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: '空间频率 (lp/mm)' },
                        min: 0,
                        max: 200
                    },
                    y: {
                        type: 'linear',
                        title: { display: true, text: 'MTF (%)' },
                        min: 0,
                        max: 100
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    renderAberrationRadar(canvasId, aberrationData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const abKeys = ['spherical', 'coma', 'astigmatism', 'fieldCurvature', 'distortion'];
        const abLabels = ['球差', '彗差', '像散', '场曲', '畸变'];
        const datasets = [];
        const fieldColors = [this.colors.primary, this.colors.warning, this.colors.danger];
        const fieldNames = ['轴上', '0.7视场', '全视场'];

        Object.keys(aberrationData).forEach((angle, index) => {
            const data = aberrationData[angle];
            if (data) {
                datasets.push({
                    label: `${fieldNames[index] || angle}°`,
                    data: abKeys.map(key => Math.min(100, data[key] || 0)),
                    borderColor: fieldColors[index % fieldColors.length],
                    backgroundColor: fieldColors[index % fieldColors.length] + '33',
                    borderWidth: 2,
                    pointBackgroundColor: fieldColors[index % fieldColors.length]
                });
            }
        });

        this.charts[canvasId] = new Chart(ctx, {
            type: 'radar',
            data: { labels: abLabels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } }
            }
        });

        return this.charts[canvasId];
    }

    renderDailyStats(canvasId, dailyData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = ['创建', '完成', '达标', '预警'];
        const data = [
            dailyData.tasks_created || 0,
            dailyData.tasks_completed || 0,
            dailyData.quality_passed || 0,
            dailyData.warnings_sent || 0
        ];

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '今日统计',
                    data,
                    backgroundColor: [
                        this.colors.primary,
                        this.colors.success,
                        this.colors.cyan,
                        this.colors.warning
                    ],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    renderAberrationDistribution(canvasId, aberrationTypes) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const aberrationNames = {
            spherical: '球差',
            coma: '彗差',
            astigmatism: '像散',
            fieldCurvature: '场曲',
            distortion: '畸变'
        };

        const labels = Object.keys(aberrationTypes).map(k => aberrationNames[k] || k);
        const data = Object.values(aberrationTypes);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: [
                        this.colors.primary,
                        this.colors.secondary,
                        this.colors.success,
                        this.colors.warning,
                        this.colors.purple
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { usePointStyle: true }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    renderCompareRadar(canvasId, compareData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || !compareData || compareData.length < 2) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = ['波前RMS', 'MTF截止', '像质评分', '优化效率', '光斑RMS', '球差', '彗差', '像散', '场曲', '畸变'];
        
        const colors = [this.colors.primary, this.colors.success, this.colors.warning, this.colors.purple, this.colors.cyan];
        
        const datasets = compareData.map((task, index) => {
            const r = task.results;
            const overall = r?.overall || {};
            const abKeys = Object.keys(r?.aberrations || {});
            const firstAb = abKeys.length > 0 ? r.aberrations[abKeys[0]] : {};

            const rmsScore = Math.max(0, Math.min(100, 100 - (overall.avgRmsWavefront || 0) * 50));
            const mtfScore = Math.max(0, Math.min(100, (overall.avgMTFCutoff || 0)));
            const qualityScore = task.qualityScore || 0;
            const efficiencyScore = Math.max(0, 100 - (task.iterations || 0) * 5);
            const spotScore = Math.max(0, Math.min(100, 100 - (overall.avgRmsSpot || 0) * 10));
            const sphericalScore = Math.max(0, 100 - (firstAb.spherical || 0));
            const comaScore = Math.max(0, 100 - (firstAb.coma || 0));
            const astigScore = Math.max(0, 100 - (firstAb.astigmatism || 0));
            const fieldScore = Math.max(0, 100 - (firstAb.fieldCurvature || 0));
            const distScore = Math.max(0, 100 - (firstAb.distortion || 0));

            return {
                label: task.name,
                data: [rmsScore, mtfScore, qualityScore, efficiencyScore, spotScore,
                       sphericalScore, comaScore, astigScore, fieldScore, distScore],
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '22',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: colors[index % colors.length]
            };
        });

        this.charts[canvasId] = new Chart(ctx, {
            type: 'radar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r.toFixed(1)}`
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 20, font: { size: 10 } },
                        pointLabels: { font: { size: 11 } }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    updateMetrics(task) {
        if (!task || !task.analysisResults) return;

        const rmsEl = document.getElementById('rmsValue');
        const mtfEl = document.getElementById('mtfValue');
        const iterEl = document.getElementById('iterValue');
        const scoreEl = document.getElementById('scoreValue');

        if (rmsEl) {
            rmsEl.textContent = task.analysisResults.overall.avgRmsWavefront.toFixed(4);
        }
        if (mtfEl) {
            mtfEl.textContent = task.analysisResults.overall.avgMTFCutoff.toFixed(1);
        }
        if (iterEl) {
            iterEl.textContent = task.iterations || 0;
        }
        if (scoreEl) {
            scoreEl.textContent = task.qualityScore || 0;
        }
    }

    updateTaskListUI(tasks, selectedId) {
        const container = document.getElementById('taskList');
        const countEl = document.getElementById('taskCount');
        
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>暂无设计任务，请上传透镜参数开始</p>
                </div>
            `;
            if (countEl) countEl.textContent = '0 个任务';
            return;
        }

        if (countEl) countEl.textContent = `${tasks.length} 个任务`;

        container.innerHTML = tasks.map(task => `
            <div class="task-card ${task.id === selectedId ? 'selected' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">${task.name}</div>
                    <span class="task-status status-${task.status}">${STATUS_LABELS[task.status] || task.status}</span>
                </div>
                <div class="task-meta">
                    <span>🕐 ${this.formatTime(task.createdAt)}</span>
                    <span>🔄 ${task.iterations || 0} 次迭代</span>
                    <span>🎯 ${task.qualityScore || 0} 分</span>
                </div>
                ${task.status !== TASK_STATUS.PENDING && task.status !== TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.ERROR ? `
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.progress}%"></div>
                    </div>
                </div>
                ` : ''}
                ${task.status === TASK_STATUS.PAUSED ? `
                <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-primary" onclick="app.resumeTask('${task.id}')">▶️ 继续</button>
                    <button class="btn btn-sm btn-secondary" onclick="app.deleteTask('${task.id}')">🗑️ 删除</button>
                </div>
                ` : ''}
            </div>
        `).join('');

        container.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const taskId = card.dataset.taskId;
                    taskManager.selectTask(taskId);
                }
            });
        });
    }

    formatTime(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        return date.toLocaleDateString();
    }

    showNotification(message, type = 'info') {
        const el = document.getElementById('notification');
        if (!el) return;

        el.textContent = message;
        el.className = `notification show ${type}`;

        setTimeout(() => {
            el.classList.remove('show');
        }, 3000);
    }

    showAlert(message, details) {
        const modal = document.getElementById('alertModal');
        const msgEl = document.getElementById('alertMessage');
        const detailsEl = document.getElementById('alertDetails');

        if (msgEl) msgEl.textContent = message;
        if (detailsEl) detailsEl.textContent = details;
        if (modal) modal.classList.add('show');
    }

    hideAlert() {
        const modal = document.getElementById('alertModal');
        if (modal) modal.classList.remove('show');
    }
}

const visualization = new OpticalVisualization();
