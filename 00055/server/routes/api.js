const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { TaskModel, OptimizationLogModel, WarningModel, DailyStatsModel } = require('../models/database');
const { OpticalSystem, parseLensFile, evaluateQuality, generateSampleLensData } = require('../services/optics-engine');
const { Optimizer } = require('../services/optimizer');
const { sendWarningEmail, sendCompletionEmail } = require('../services/mailer');
const { generatePDF } = require('../services/pdf-generator');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const activeTasks = new Map();

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    const fs = require('fs');
    const text = fs.readFileSync(req.file.path, 'utf-8');
    const result = parseLensFile(text, req.file.originalname);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload-and-start', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    const fs = require('fs');
    const text = fs.readFileSync(req.file.path, 'utf-8');
    const result = parseLensFile(text, req.file.originalname);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
    if (!result.success) return res.status(400).json({ error: result.error });

    const lensData = result.data;
    const name = lensData.name || req.file.originalname.replace(/\.[^/.]+$/, '');
    const rmsThreshold = parseFloat(req.body.rmsThreshold) || 0.07;
    const mtfThreshold = parseFloat(req.body.mtfThreshold) || 50;
    const maxIterations = parseInt(req.body.maxIterations) || 20;
    const adminEmail = req.body.adminEmail || 'admin@optical.com';

    const id = uuidv4();
    const task = TaskModel.create({
      id, name, status: 'pending', lens_data: lensData, original_lens_data: lensData,
      rmsThreshold, mtfThreshold, maxIterations, adminEmail
    });
    DailyStatsModel.increment('tasks_created');

    res.json({ success: true, task, message: '任务已创建并启动' });

    executeTask(task.id).catch(err => {
      console.error(`[TASK] 上传启动任务 ${task.id} 执行失败:`, err);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sample', (req, res) => {
  res.json({ success: true, data: generateSampleLensData() });
});

router.post('/tasks', (req, res) => {
  try {
    const { name, lensData, rmsThreshold, mtfThreshold, maxIterations, adminEmail } = req.body;
    if (!lensData || !lensData.surfaces) return res.status(400).json({ error: '缺少透镜参数' });

    const id = uuidv4();
    const task = TaskModel.create({
      id,
      name: name || '光学设计任务',
      status: 'pending',
      lens_data: lensData,
      original_lens_data: lensData,
      rmsThreshold: rmsThreshold || 0.07,
      mtfThreshold: mtfThreshold || 50,
      maxIterations: maxIterations || 20,
      adminEmail: adminEmail || 'admin@optical.com'
    });

    DailyStatsModel.increment('tasks_created');
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks', (req, res) => {
  try {
    const tasks = TaskModel.getAll();
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks/:id', (req, res) => {
  try {
    const task = TaskModel.getById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    const logs = OptimizationLogModel.getByTaskId(req.params.id);
    const warnings = WarningModel.getByTaskId(req.params.id);
    res.json({ success: true, task: { ...task, optimization_logs: logs, task_warnings: warnings } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:id', (req, res) => {
  try {
    TaskModel.deleteById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/start', async (req, res) => {
  try {
    const task = TaskModel.getById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    if (activeTasks.has(task.id)) return res.status(409).json({ error: '任务正在运行' });

    res.json({ success: true, message: '任务已启动', taskId: task.id });

    executeTask(task.id).catch(err => {
      console.error(`[TASK] 任务 ${task.id} 执行失败:`, err);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/pause', (req, res) => {
  try {
    const task = TaskModel.getById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    TaskModel.updateStatus(task.id, 'paused');
    activeTasks.delete(task.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/resume', async (req, res) => {
  try {
    const task = TaskModel.getById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    TaskModel.updateConsecutiveNonConverging(task.id, 0);
    TaskModel.updateStatus(task.id, 'pending', 0);
    res.json({ success: true, taskId: task.id });
    executeTask(task.id).catch(err => console.error(`[TASK] 任务恢复失败:`, err));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks/:id/logs', (req, res) => {
  try {
    const logs = OptimizationLogModel.getByTaskId(req.params.id);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks/:id/pdf', async (req, res) => {
  try {
    const task = TaskModel.getById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    const logs = OptimizationLogModel.getByTaskId(req.params.id);
    const pdfBuffer = await generatePDF({ ...task, optimization_logs: logs });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="optical_report_${req.params.id.slice(0,8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks/:id/raydata', (req, res) => {
  try {
    const task = TaskModel.getById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    const system = new OpticalSystem();
    system.loadFromData(task.lens_data);
    const rayData = {};
    system.fieldAngles.forEach(angle => {
      const rays = system.traceField(angle);
      rayData[angle] = rays.map(r => ({
        wavelength: r.wavelength,
        origin: [r.origin.x, r.origin.y, r.origin.z],
        direction: [r.direction.x, r.direction.y, r.direction.z],
        path: r.path.map(p => ({ point: [p.point.x, p.point.y, p.point.z], intensity: p.intensity }))
      }));
    });
    res.json({ success: true, rays: rayData, lensParameters: task.lens_data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard', (req, res) => {
  try {
    const metrics = DailyStatsModel.getAggregatedMetrics();
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/compare', (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: '请提供任务ID列表' });
    const taskIds = ids.split(',');
    const tasks = taskIds.map(id => {
      const t = TaskModel.getById(id);
      if (t) t.optimization_logs = OptimizationLogModel.getByTaskId(id);
      return t;
    }).filter(Boolean);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/warnings/unread', (req, res) => {
  try {
    const warnings = WarningModel.getUnread();
    res.json({ success: true, warnings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/warnings/:id/read', (req, res) => {
  try {
    WarningModel.markRead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function executeTask(taskId) {
  const task = TaskModel.getById(taskId);
  if (!task) return;
  activeTasks.set(taskId, true);

  try {
    TaskModel.updateStatus(taskId, 'parsing', 10);
    await delay(200);

    const system = new OpticalSystem();
    system.loadFromData(task.lens_data);

    TaskModel.updateStatus(taskId, 'tracing', 25);
    await delay(300);

    TaskModel.updateStatus(taskId, 'calculating', 50);
    await delay(200);

    const analysis = system.calculateFullAnalysis();
    const quality = evaluateQuality(analysis, task.rms_threshold, task.mtf_threshold);
    TaskModel.updateAnalysis(taskId, analysis, quality.score, quality.meets);

    if (!quality.meets) {
      TaskModel.updateStatus(taskId, 'optimizing', 60);

      const optimizer = new Optimizer(system, task, {
        logCallback: (type, message) => {
          console.log(`[OPTIMIZER] [${type}] ${message}`);
        },
        statusCallback: (status, progress) => {
          TaskModel.updateStatus(taskId, status, progress);
        }
      });

      const result = await optimizer.run();

      TaskModel.updateLensData(taskId, optimizer.lensData);
      const finalSystem = new OpticalSystem();
      finalSystem.loadFromData(optimizer.lensData);
      const finalAnalysis = finalSystem.calculateFullAnalysis();
      const finalQuality = evaluateQuality(finalAnalysis, task.rms_threshold, task.mtf_threshold);
      TaskModel.updateAnalysis(taskId, finalAnalysis, finalQuality.score, finalQuality.meets);

      result.iterations && DailyStatsModel.increment('total_iterations', result.iterations);

      if (result.paused) {
        TaskModel.updateStatus(taskId, 'paused', 90);
        const warningMsg = '连续三次优化不收敛，任务已自动暂停';
        WarningModel.create({ taskId, message: warningMsg, type: 'convergence' });
        DailyStatsModel.increment('warnings_sent');
        sendWarningEmail(task.admin_email, task.name, warningMsg,
          `RMS: ${result.rms.toFixed(4)}λ, MTF: ${result.mtf.toFixed(1)} lp/mm`);
      }
    }

    if (task.status !== 'paused') {
      TaskModel.updateStatus(taskId, 'completed', 100);
      DailyStatsModel.increment('tasks_completed');
      const updatedTask = TaskModel.getById(taskId);
      if (updatedTask.meets_requirements) {
        DailyStatsModel.increment('quality_passed');
      }
      sendCompletionEmail(task.admin_email, task.name, updatedTask.quality_score, updatedTask.meets_requirements);
    }
  } catch (err) {
    console.error(`[TASK] 任务 ${taskId} 执行失败:`, err);
    TaskModel.updateStatus(taskId, 'error', 100);
    WarningModel.create({ taskId, message: `执行错误: ${err.message}`, type: 'error' });
    DailyStatsModel.increment('tasks_errored');
  } finally {
    activeTasks.delete(taskId);
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = router;
