const { OpticalSystem, evaluateQuality } = require('./optics-engine');

class Optimizer {
  constructor(system, task, opts = {}) {
    this.system = system;
    this.taskId = task.id;
    this.lensData = task.lens_data;
    this.rmsThreshold = task.rms_threshold || 0.07;
    this.mtfThreshold = task.mtf_threshold || 50;
    this.maxIterations = task.max_iterations || 20;
    this.bestRMS = Infinity;
    this.bestMTF = 0;
    this.bestConfig = null;
    this.consecutiveNonConverging = 0;
    this.logCallback = opts.logCallback || (() => {});
    this.statusCallback = opts.statusCallback || (() => {});
  }

  async run() {
    const initialAnalysis = this.system.calculateFullAnalysis();
    this.bestRMS = initialAnalysis.overall.avgRmsWavefront;
    this.bestMTF = initialAnalysis.overall.avgMTFCutoff;
    this.bestConfig = JSON.parse(JSON.stringify(this.lensData));

    this.logCallback('info', `开始优化, 目标: RMS≤${this.rmsThreshold}λ, MTF≥${this.mtfThreshold} lp/mm`);
    this.logCallback('info', `初始状态 - RMS: ${this.bestRMS.toFixed(4)}λ, MTF: ${this.bestMTF.toFixed(1)} lp/mm`);

    for (let iter = 1; iter <= this.maxIterations; iter++) {
      const progress = 60 + (iter / this.maxIterations) * 30;
      this.statusCallback('optimizing', progress);

      const adjustment = this._generateAdjustment(iter);
      this._applyAdjustment(this.lensData, adjustment);
      this.system.loadFromData(this.lensData);

      const analysis = this.system.calculateFullAnalysis();
      const curRMS = analysis.overall.avgRmsWavefront;
      const curMTF = analysis.overall.avgMTFCutoff;
      const improved = this._isImprovement(curRMS, curMTF);

      const adjDesc = adjustment.map(a => `S${a.surface + 1}${a.type === 'thickness' ? '厚度' : a.type === 'radius' ? '曲率' : '非球面'}`).join(', ') || '无';

      if (improved) {
        this.bestRMS = curRMS;
        this.bestMTF = curMTF;
        this.bestConfig = JSON.parse(JSON.stringify(this.lensData));
        this.consecutiveNonConverging = 0;
        this.logCallback('success', `迭代${iter}: 改进✓ RMS:${curRMS.toFixed(4)}λ MTF:${curMTF.toFixed(1)} 调整:${adjDesc}`);

        if (curRMS <= this.rmsThreshold && curMTF >= this.mtfThreshold) {
          this.logCallback('success', '目标达成! 提前结束优化');
          this._restoreBest();
          return { converged: true, iterations: iter, rms: curRMS, mtf: curMTF };
        }
      } else {
        this._revertAdjustment(this.lensData, adjustment);
        this.consecutiveNonConverging++;
        this.logCallback('warning', `迭代${iter}: 未改进✗ RMS:${curRMS.toFixed(4)}λ MTF:${curMTF.toFixed(1)}`);

        if (this.consecutiveNonConverging >= 3) {
          this.logCallback('error', `连续${this.consecutiveNonConverging}次未收敛, 暂停优化`);
          this._restoreBest();
          return { converged: false, iterations: iter, rms: this.bestRMS, mtf: this.bestMTF, paused: true };
        }
      }

      await new Promise(r => setTimeout(r, 50));
    }

    this._restoreBest();
    return { converged: this.bestRMS <= this.rmsThreshold, iterations: this.maxIterations, rms: this.bestRMS, mtf: this.bestMTF };
  }

  _isImprovement(curRMS, curMTF) {
    const curScore = Math.max(0, 1 - curRMS / this.rmsThreshold) * 0.6 + Math.min(1, curMTF / this.mtfThreshold) * 0.4;
    const bestScore = Math.max(0, 1 - this.bestRMS / this.rmsThreshold) * 0.6 + Math.min(1, this.bestMTF / this.mtfThreshold) * 0.4;
    return curScore > bestScore + 0.001;
  }

  _generateAdjustment(iteration) {
    const adj = [];
    const temp = 1 / (1 + iteration * 0.1);
    const surfaces = this.system.surfaces;
    for (let i = 0; i < surfaces.length; i++) {
      const s = surfaces[i];
      if (s.refractiveIndex > 1.0 && Math.random() < 0.4 * temp) {
        const oldT = s.thickness;
        const newT = Math.max(0.5, Math.min(20, oldT + (Math.random() - 0.5) * 2 * temp));
        if (Math.abs(newT - oldT) > 0.01) adj.push({ type: 'thickness', surface: i, oldValue: oldT, newValue: newT });
      }
      if (isFinite(s.radius) && Math.abs(s.radius) > 5 && Math.random() < 0.3 * temp) {
        const oldR = s.radius;
        const newR = oldR + (Math.random() - 0.5) * 10 * temp;
        if (Math.abs(newR) > 5) adj.push({ type: 'radius', surface: i, oldValue: oldR, newValue: newR });
      }
      if (Math.random() < 0.15 * temp && i > 0) {
        const coeffs = s.asphericCoeffs || [0, 0, 0, 0];
        const idx = Math.floor(Math.random() * 4);
        const newCoeffs = [...coeffs];
        newCoeffs[idx] += (Math.random() - 0.5) * 0.0001 * temp;
        adj.push({ type: 'aspheric', surface: i, coeffIndex: idx, oldValue: coeffs[idx], newValue: newCoeffs[idx] });
      }
    }
    return adj;
  }

  _applyAdjustment(data, adjustments) {
    adjustments.forEach(a => {
      const s = data.surfaces[a.surface];
      if (a.type === 'thickness') s.thickness = a.newValue;
      else if (a.type === 'radius') s.radius = a.newValue;
      else if (a.type === 'aspheric') {
        if (!s.asphericCoeffs) s.asphericCoeffs = [0, 0, 0, 0];
        s.asphericCoeffs[a.coeffIndex] = a.newValue;
        s.type = 'aspheric';
      }
    });
  }

  _revertAdjustment(data, adjustments) {
    adjustments.forEach(a => {
      const s = data.surfaces[a.surface];
      if (a.type === 'thickness') s.thickness = a.oldValue;
      else if (a.type === 'radius') s.radius = a.oldValue;
      else if (a.type === 'aspheric' && s.asphericCoeffs) s.asphericCoeffs[a.coeffIndex] = a.oldValue;
    });
  }

  _restoreBest() {
    if (this.bestConfig) this.lensData.surfaces = JSON.parse(JSON.stringify(this.bestConfig.surfaces));
  }
}

module.exports = { Optimizer };
