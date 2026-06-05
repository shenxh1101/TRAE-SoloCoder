const STATUS_LABELS = {
  pending: '待解析', parsing: '解析中', tracing: '光线追迹中',
  calculating: '像差计算中', optimizing: '优化迭代中',
  completed: '完成', error: '异常', paused: '已暂停'
};

class OpticalDesignApp {
  constructor() {
    this.currentLensData = null;
    this.pollingTimers = {};
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.refreshTaskList();
  }

  setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    if (uploadArea) {
      uploadArea.addEventListener('click', () => fileInput.click());
      uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
      uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
      uploadArea.addEventListener('drop', e => {
        e.preventDefault(); uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) this.handleFileUpload(e.dataTransfer.files[0]);
      });
    }

    if (fileInput) fileInput.addEventListener('change', e => {
      if (e.target.files.length > 0) this.handleFileUpload(e.target.files[0]);
    });

    this.on('loadSampleBtn', 'click', () => this.loadSampleData());
    this.on('startDesignBtn', 'click', () => this.startDesign());
    this.on('pauseDesignBtn', 'click', () => this.pauseDesign());

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => this.switchTab(e.target.dataset.tab));
    });

    this.on('dashboardBtn', 'click', () => this.showDashboard());
    this.on('compareBtn', 'click', () => this.showCompareModal());

    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', e => e.target.closest('.modal').classList.remove('show'));
    });
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    });

    this.on('acknowledgeAlertBtn', 'click', () => {
      document.getElementById('alertModal').classList.remove('show');
    });
    this.on('clearLogBtn', 'click', () => this.clearOptimizationLog());
    this.on('exportPdfBtn', 'click', () => this.exportPDFReport());
    this.on('exportDataBtn', 'click', () => this.exportRayData());
  }

  on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }

  async handleFileUpload(file) {
    try {
      const options = {
        rmsThreshold: parseFloat(document.getElementById('rmsThreshold').value) || 0.07,
        mtfThreshold: parseFloat(document.getElementById('mtfThreshold').value) || 50,
        maxIterations: parseInt(document.getElementById('maxIterations').value) || 20,
        adminEmail: document.getElementById('adminEmail').value || 'admin@optical.com'
      };

      this.showNotification(`正在上传 "${file.name}" 并启动设计...`, 'info');
      const result = await ApiClient.uploadAndStart(file, options);

      this.selectedTaskId = result.task.id;
      document.getElementById('startDesignBtn').disabled = true;
      document.getElementById('pauseDesignBtn').disabled = false;

      this.startPolling(result.task.id);
      this.showNotification(`文件解析成功，任务已创建并启动光线追迹`, 'success');
      this.refreshTaskList();
    } catch (err) {
      this.showNotification(`操作失败: ${err.message}`, 'error');
    }
  }

  async loadSampleData() {
    try {
      const result = await ApiClient.getSampleData();
      this.currentLensData = result.data;
      document.getElementById('startDesignBtn').disabled = false;
      this.showNotification('已加载示例透镜数据（双高斯物镜）', 'success');
    } catch (err) {
      this.showNotification(`加载失败: ${err.message}`, 'error');
    }
  }

  async startDesign() {
    if (!this.currentLensData) {
      this.showNotification('请先上传透镜参数', 'warning');
      return;
    }

    try {
      const result = await ApiClient.createTask({
        name: this.currentLensData.name || '光学设计任务',
        lensData: this.currentLensData,
        rmsThreshold: parseFloat(document.getElementById('rmsThreshold').value) || 0.07,
        mtfThreshold: parseFloat(document.getElementById('mtfThreshold').value) || 50,
        maxIterations: parseInt(document.getElementById('maxIterations').value) || 20,
        adminEmail: document.getElementById('adminEmail').value || 'admin@optical.com'
      });

      this.selectedTaskId = result.task.id;
      document.getElementById('startDesignBtn').disabled = true;
      document.getElementById('pauseDesignBtn').disabled = false;

      await ApiClient.startTask(result.task.id);
      this.startPolling(result.task.id);
      this.showNotification(`任务已创建并启动`, 'success');
      this.refreshTaskList();
    } catch (err) {
      this.showNotification(`启动失败: ${err.message}`, 'error');
    }
  }

  async pauseDesign() {
    if (!this.selectedTaskId) return;
    try {
      await ApiClient.pauseTask(this.selectedTaskId);
      this.stopPolling(this.selectedTaskId);
      document.getElementById('pauseDesignBtn').disabled = true;
      document.getElementById('startDesignBtn').disabled = false;
      this.showNotification('任务已暂停', 'info');
      this.refreshTaskList();
    } catch (err) {
      this.showNotification(`暂停失败: ${err.message}`, 'error');
    }
  }

  async resumeTask(taskId) {
    try {
      await ApiClient.resumeTask(taskId);
      this.selectedTaskId = taskId;
      this.startPolling(taskId);
      this.showNotification('任务已恢复', 'success');
      this.refreshTaskList();
    } catch (err) {
      this.showNotification(`恢复失败: ${err.message}`, 'error');
    }
  }

  async deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) return;
    try {
      this.stopPolling(taskId);
      await ApiClient.deleteTask(taskId);
      this.showNotification('任务已删除', 'info');
      this.refreshTaskList();
    } catch (err) {
      this.showNotification(`删除失败: ${err.message}`, 'error');
    }
  }

  startPolling(taskId) {
    this.stopPolling(taskId);
    this.pollingTimers[taskId] = setInterval(() => this.pollTaskStatus(taskId), 2000);
  }

  stopPolling(taskId) {
    if (this.pollingTimers[taskId]) {
      clearInterval(this.pollingTimers[taskId]);
      delete this.pollingTimers[taskId];
    }
  }

  async pollTaskStatus(taskId) {
    try {
      const result = await ApiClient.getTask(taskId);
      const task = result.task;
      this.updateTaskCard(task);

      if (task.id === this.selectedTaskId && task.analysis_results) {
        this.updateAnalysisView(task);
      }

      if (task.status === 'completed' || task.status === 'error' || task.status === 'paused') {
        this.stopPolling(taskId);
        document.getElementById('startDesignBtn').disabled = !this.currentLensData;
        document.getElementById('pauseDesignBtn').disabled = true;

        if (task.status === 'completed') {
          this.showNotification(`任务 "${task.name}" 已完成`, 'success');
        } else if (task.status === 'paused') {
          this.showAlert('优化暂停预警',
            `任务 "${task.name}" 连续三次优化不收敛，已自动暂停。预警已推送至: ${task.admin_email}`);
        }
      }

      if (task.optimization_logs) {
        this.updateOptimizationLog(task.optimization_logs);
      }
    } catch (err) {
      console.error('轮询失败:', err);
    }
  }

  async refreshTaskList() {
    try {
      const result = await ApiClient.getTasks();
      this.renderTaskList(result.tasks);
    } catch (err) {
      console.error('刷新任务列表失败:', err);
    }
  }

  renderTaskList(tasks) {
    const container = document.getElementById('taskList');
    const countEl = document.getElementById('taskCount');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>暂无设计任务，请上传透镜参数开始</p></div>';
      if (countEl) countEl.textContent = '0 个任务';
      return;
    }

    if (countEl) countEl.textContent = `${tasks.length} 个任务`;

    container.innerHTML = tasks.map(task => `
      <div class="task-card ${task.id === this.selectedTaskId ? 'selected' : ''}" data-task-id="${task.id}">
        <div class="task-header">
          <div class="task-title">${task.name}</div>
          <span class="task-status status-${task.status}">${STATUS_LABELS[task.status] || task.status}</span>
        </div>
        <div class="task-meta">
          <span>🕐 ${this.formatTime(task.created_at)}</span>
          <span>🔄 ${task.iterations || 0} 次迭代</span>
          <span>🎯 ${task.quality_score || 0} 分</span>
        </div>
        ${task.status !== 'pending' && task.status !== 'completed' && task.status !== 'error' ? `
        <div class="task-progress">
          <div class="progress-bar"><div class="progress-fill" style="width: ${task.progress || 0}%"></div></div>
        </div>` : ''}
        ${task.status === 'paused' ? `
        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
          <button class="btn btn-sm btn-primary" onclick="app.resumeTask('${task.id}')">▶️ 继续</button>
          <button class="btn btn-sm btn-secondary" onclick="app.deleteTask('${task.id}')">🗑️ 删除</button>
        </div>` : ''}
      </div>
    `).join('');

    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', e => {
        if (!e.target.closest('button')) {
          this.selectTask(card.dataset.taskId);
        }
      });
    });
  }

  updateTaskCard(task) {
    const card = document.querySelector(`.task-card[data-task-id="${task.id}"]`);
    if (card) {
      const statusEl = card.querySelector('.task-status');
      if (statusEl) {
        statusEl.className = `task-status status-${task.status}`;
        statusEl.textContent = STATUS_LABELS[task.status] || task.status;
      }
      const progressEl = card.querySelector('.progress-fill');
      if (progressEl) progressEl.style.width = `${task.progress || 0}%`;
      const metaEls = card.querySelectorAll('.task-meta span');
      if (metaEls.length >= 3) {
        metaEls[1].textContent = `🔄 ${task.iterations || 0} 次迭代`;
        metaEls[2].textContent = `🎯 ${task.quality_score || 0} 分`;
      }
    } else {
      this.refreshTaskList();
    }
  }

  async selectTask(taskId) {
    this.selectedTaskId = taskId;
    try {
      const result = await ApiClient.getTask(taskId);
      const task = result.task;
      if (task.analysis_results) {
        this.switchTab('analysis');
        this.updateAnalysisView(task);
      }
      this.refreshTaskList();
    } catch (err) {
      console.error('选择任务失败:', err);
    }
  }

  updateAnalysisView(task) {
    if (!task || !task.analysis_results) return;

    const analysis = task.analysis_results;
    visualization.renderSpotDiagram('spotChart', analysis.spots);
    visualization.renderWavefront('wavefrontChart', analysis.wavefront[0]);
    visualization.renderMTF('mtfChart', analysis.mtf);
    visualization.renderAberrationRadar('aberrationChart', analysis.aberrations);

    const rmsEl = document.getElementById('rmsValue');
    const mtfEl = document.getElementById('mtfValue');
    const iterEl = document.getElementById('iterValue');
    const scoreEl = document.getElementById('scoreValue');

    if (rmsEl) rmsEl.textContent = analysis.overall.avgRmsWavefront.toFixed(4);
    if (mtfEl) mtfEl.textContent = analysis.overall.avgMTFCutoff.toFixed(1);
    if (iterEl) iterEl.textContent = task.iterations || 0;
    if (scoreEl) scoreEl.textContent = task.quality_score || 0;

    document.getElementById('exportPdfBtn').disabled = false;
    document.getElementById('exportDataBtn').disabled = false;
  }

  updateOptimizationLog(logs) {
    const container = document.getElementById('logContainer');
    if (!container || !logs) return;

    const emptyEl = container.querySelector('.log-empty');
    if (emptyEl) emptyEl.remove();

    const existingCount = container.querySelectorAll('.log-entry').length;
    const newLogs = logs.slice(existingCount);

    newLogs.forEach(log => {
      const type = log.improved ? 'success' : 'warning';
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `
        <span class="log-time">${new Date(log.created_at).toLocaleTimeString()}</span>
        <span class="log-type ${type}">${type.toUpperCase()}</span>
        <span class="log-message">迭代${log.iteration}: RMS=${log.rms?.toFixed(4) || '-'}λ MTF=${log.mtf?.toFixed(1) || '-'} ${log.improved ? '✓' : '✗'} ${log.adjustment_type || ''}</span>
      `;
      container.appendChild(entry);
    });

    container.scrollTop = container.scrollHeight;
  }

  clearOptimizationLog() {
    const container = document.getElementById('logContainer');
    if (container) container.innerHTML = '<div class="log-empty">暂无优化记录</div>';
  }

  async showDashboard() {
    const modal = document.getElementById('dashboardModal');
    if (!modal) return;

    try {
      const result = await ApiClient.getDashboard();
      const m = result.metrics;

      document.getElementById('completionRate').textContent = `${m.completionRate}%`;
      document.getElementById('avgIterations').textContent = m.avgIterations;
      document.getElementById('qualityRate').textContent = `${m.qualityRate}%`;
      document.getElementById('warningCount').textContent = m.warningCount;

      setTimeout(() => {
        visualization.renderDailyStats('dailyStatsChart', m.daily);
        const abTypes = {
          spherical: m.daily.aberration_spherical, coma: m.daily.aberration_coma,
          astigmatism: m.daily.aberration_astigmatism, fieldCurvature: m.daily.aberration_field_curvature,
          distortion: m.daily.aberration_distortion
        };
        visualization.renderAberrationDistribution('aberrationDistChart', abTypes);
      }, 100);
    } catch (err) {
      this.showNotification(`看板加载失败: ${err.message}`, 'error');
    }

    modal.classList.add('show');
  }

  async showCompareModal() {
    const modal = document.getElementById('compareModal');
    if (!modal) return;

    try {
      const result = await ApiClient.getTasks();
      const tasks = result.tasks.filter(t => t.status === 'completed');
      const checkboxContainer = document.getElementById('compareCheckboxes');

      if (checkboxContainer) {
        checkboxContainer.innerHTML = tasks.map(task => `
          <label class="checkbox-item">
            <input type="checkbox" value="${task.id}" class="compare-checkbox">
            ${task.name}
          </label>
        `).join('');

        checkboxContainer.querySelectorAll('.compare-checkbox').forEach(cb => {
          cb.addEventListener('change', () => this.updateCompareResults());
        });
      }

      document.getElementById('compareResults').innerHTML =
        '<p class="text-center text-muted">请选择至少2个任务进行对比</p>';
    } catch (err) {
      this.showNotification(`加载对比数据失败: ${err.message}`, 'error');
    }

    modal.classList.add('show');
  }

  async updateCompareResults() {
    const checkboxes = document.querySelectorAll('.compare-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const resultsContainer = document.getElementById('compareResults');

    if (selectedIds.length < 2) {
      resultsContainer.innerHTML = '<p class="text-center text-muted">请选择至少2个任务进行对比</p>';
      return;
    }

    try {
      const result = await ApiClient.compareTasks(selectedIds);
      const tasks = result.tasks;
      const aberrationNames = { spherical: '球差', coma: '彗差', astigmatism: '像散', fieldCurvature: '场曲', distortion: '畸变' };

      let html = `
        <div class="compare-table-container">
          <table class="compare-table">
            <thead><tr><th>指标</th>${tasks.map(t => `<th>${t.name}</th>`).join('')}</tr></thead>
            <tbody>
              <tr><td>像质评分</td>${tasks.map(t => `<td>${t.quality_score || 0} 分</td>`).join('')}</tr>
              <tr><td>优化次数</td>${tasks.map(t => `<td>${t.iterations || 0} 次</td>`).join('')}</tr>
              <tr><td>波前RMS</td>${tasks.map(t => `<td>${t.analysis_results?.overall?.avgRmsWavefront.toFixed(4) || '-'} λ</td>`).join('')}</tr>
              <tr><td>MTF截止</td>${tasks.map(t => `<td>${t.analysis_results?.overall?.avgMTFCutoff.toFixed(1) || '-'} lp/mm</td>`).join('')}</tr>
              ${Object.keys(aberrationNames).map(ab => `
                <tr><td>${aberrationNames[ab]}</td>${tasks.map(t => `<td>${t.analysis_results?.aberrations?.[0]?.[ab]?.toFixed(2) || '-'}%</td>`).join('')}</tr>
              `).join('')}
              <tr><td>达标</td>${tasks.map(t => `<td>${t.meets_requirements ? '✅' : '❌'}</td>`).join('')}</tr>
            </tbody>
          </table>
        </div>
        <div class="chart-card radar-compare">
          <h4>综合性能雷达图对比</h4>
          <canvas id="compareRadarChart"></canvas>
        </div>`;

      resultsContainer.innerHTML = html;

      setTimeout(() => {
        const compareData = tasks.map(t => ({
          name: t.name, results: t.analysis_results, qualityScore: t.quality_score, iterations: t.iterations
        }));
        visualization.renderCompareRadar('compareRadarChart', compareData);
      }, 100);
    } catch (err) {
      resultsContainer.innerHTML = `<p class="text-center text-muted">对比加载失败: ${err.message}</p>`;
    }
  }

  async exportPDFReport() {
    if (!this.selectedTaskId) {
      this.showNotification('请先选择一个任务', 'warning');
      return;
    }
    try {
      await ApiClient.downloadPDF(this.selectedTaskId);
      this.showNotification('PDF报告已下载', 'success');
    } catch (err) {
      this.showNotification(`导出失败: ${err.message}`, 'error');
    }
  }

  async exportRayData() {
    if (!this.selectedTaskId) {
      this.showNotification('请先选择一个任务', 'warning');
      return;
    }
    try {
      await ApiClient.downloadRayData(this.selectedTaskId);
      this.showNotification('光线数据已下载', 'success');
    } catch (err) {
      this.showNotification(`导出失败: ${err.message}`, 'error');
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `${tabName}-tab`);
    });
  }

  formatTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
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
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  showAlert(message, details) {
    const modal = document.getElementById('alertModal');
    const msgEl = document.getElementById('alertMessage');
    const detailsEl = document.getElementById('alertDetails');
    if (msgEl) msgEl.textContent = message;
    if (detailsEl) detailsEl.textContent = details;
    if (modal) modal.classList.add('show');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new OpticalDesignApp();
});
