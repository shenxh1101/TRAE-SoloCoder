class Optimizer {
    constructor(system, task) {
        this.system = system;
        this.task = task;
        this.bestRMS = Infinity;
        this.bestMTF = 0;
        this.bestConfig = null;
        this.improvementHistory = [];
        this.isPaused = false;
    }

    async optimize(lensData, options) {
        const { maxIterations, rmsThreshold, mtfThreshold } = options;
        let iteration = 0;
        let converging = true;
        let lastImprovement = 0;

        this.logOptimization('INFO', `开始优化，最大迭代次数: ${maxIterations}`);
        this.logOptimization('INFO', `目标 - 波前RMS ≤ ${rmsThreshold}λ, MTF ≥ ${mtfThreshold} lp/mm`);

        const initialAnalysis = this.system.calculateFullAnalysis();
        this.bestRMS = initialAnalysis.overall.avgRmsWavefront;
        this.bestMTF = initialAnalysis.overall.avgMTFCutoff;
        this.bestConfig = JSON.parse(JSON.stringify(lensData));

        this.logOptimization('INFO', 
            `初始状态 - 波前RMS: ${this.bestRMS.toFixed(4)}λ, MTF: ${this.bestMTF.toFixed(1)} lp/mm`);

        while (iteration < maxIterations && !this.isPaused) {
            iteration++;
            
            const progress = 60 + (iteration / maxIterations) * 30;
            this.task.updateStatus(TASK_STATUS.OPTIMIZING, progress);
            
            this.task.manager?.emit?.('taskProgress', this.task);

            const adjustment = this.generateAdjustment(iteration);
            this.applyAdjustment(lensData, adjustment);

            this.system.loadFromData(lensData);
            const analysis = this.system.calculateFullAnalysis();

            const currentRMS = analysis.overall.avgRmsWavefront;
            const currentMTF = analysis.overall.avgMTFCutoff;
            const isImproved = this.isImprovement(currentRMS, currentMTF, rmsThreshold, mtfThreshold);

            if (isImproved) {
                this.bestRMS = currentRMS;
                this.bestMTF = currentMTF;
                this.bestConfig = JSON.parse(JSON.stringify(lensData));
                lastImprovement = iteration;
                this.task.consecutiveNonConverging = 0;

                this.logOptimization('SUCCESS', 
                    `迭代 ${iteration}: 改进 ✓ RMS: ${currentRMS.toFixed(4)}λ, MTF: ${currentMTF.toFixed(1)} lp/mm`);
                this.logOptimization('INFO', 
                    `  调整: ${this.formatAdjustment(adjustment)}`);

                this.task.addOptimizationStep({
                    iteration,
                    rms: currentRMS,
                    mtf: currentMTF,
                    adjustment,
                    improved: true
                });

                if (currentRMS <= rmsThreshold && currentMTF >= mtfThreshold) {
                    this.logOptimization('SUCCESS', `目标达成！提前结束优化`);
                    this.restoreBestConfig(lensData);
                    return true;
                }
            } else {
                this.revertAdjustment(lensData, adjustment);
                this.task.consecutiveNonConverging++;

                this.logOptimization('WARNING', 
                    `迭代 ${iteration}: 未改进 ✗ RMS: ${currentRMS.toFixed(4)}λ, MTF: ${currentMTF.toFixed(1)} lp/mm`);

                this.task.addOptimizationStep({
                    iteration,
                    rms: currentRMS,
                    mtf: currentMTF,
                    adjustment,
                    improved: false
                });

                if (this.task.consecutiveNonConverging >= 3) {
                    this.logOptimization('ERROR', `连续 ${this.task.consecutiveNonConverging} 次未收敛，暂停优化`);
                    return false;
                }
            }

            this.improvementHistory.push({
                iteration,
                rms: this.bestRMS,
                mtf: this.bestMTF
            });

            this.task.manager?.updateDailyStats?.('iterations', 1);
            await this.delay(200);
        }

        this.restoreBestConfig(lensData);
        
        if (this.isPaused) {
            this.logOptimization('WARNING', '优化已暂停');
            return false;
        }

        this.logOptimization('INFO', 
            `优化结束 - 最佳: RMS ${this.bestRMS.toFixed(4)}λ, MTF ${this.bestMTF.toFixed(1)} lp/mm`);
        
        return this.bestRMS <= rmsThreshold || this.bestMTF >= mtfThreshold;
    }

    isImprovement(currentRMS, currentMTF, rmsThreshold, mtfThreshold) {
        const rmsWeight = 0.6;
        const mtfWeight = 0.4;

        const rmsScore = Math.max(0, 1 - currentRMS / rmsThreshold);
        const mtfScore = Math.min(1, currentMTF / mtfThreshold);

        const currentScore = rmsScore * rmsWeight + mtfScore * mtfWeight;

        const bestRmsScore = Math.max(0, 1 - this.bestRMS / rmsThreshold);
        const bestMtfScore = Math.min(1, this.bestMTF / mtfThreshold);
        const bestScore = bestRmsScore * rmsWeight + bestMtfScore * mtfWeight;

        return currentScore > bestScore + 0.001;
    }

    generateAdjustment(iteration) {
        const surfaces = this.system.surfaces;
        const adjustments = [];
        const temperature = 1 / (1 + iteration * 0.1);

        for (let i = 0; i < surfaces.length; i++) {
            const surface = surfaces[i];
            
            if (surface.refractiveIndex > 1.0 && Math.random() < 0.4 * temperature) {
                const oldThickness = surface.thickness;
                const thicknessDelta = (Math.random() - 0.5) * 2.0 * temperature;
                const newThickness = Math.max(0.5, Math.min(20, oldThickness + thicknessDelta));
                if (Math.abs(newThickness - oldThickness) > 0.01) {
                    adjustments.push({
                        type: 'thickness',
                        surface: i,
                        oldValue: oldThickness,
                        newValue: newThickness
                    });
                }
            }

            if (isFinite(surface.radius) && Math.abs(surface.radius) > 5 && Math.random() < 0.3 * temperature) {
                const oldRadius = surface.radius;
                const radiusDelta = (Math.random() - 0.5) * 10.0 * temperature;
                const newRadius = oldRadius + radiusDelta;
                if (Math.abs(newRadius) > 5) {
                    adjustments.push({
                        type: 'radius',
                        surface: i,
                        oldValue: oldRadius,
                        newValue: newRadius
                    });
                }
            }

            if (Math.random() < 0.15 * temperature && i > 0) {
                const coeffs = surface.asphericCoeffs || [0, 0, 0, 0];
                const newCoeffs = [...coeffs];
                const coeffIndex = Math.floor(Math.random() * 4);
                newCoeffs[coeffIndex] += (Math.random() - 0.5) * 0.0001 * temperature;
                
                adjustments.push({
                    type: 'aspheric',
                    surface: i,
                    coeffIndex,
                    oldValue: coeffs[coeffIndex],
                    newValue: newCoeffs[coeffIndex]
                });
            }
        }

        return adjustments;
    }

    applyAdjustment(lensData, adjustments) {
        adjustments.forEach(adj => {
            const surface = lensData.surfaces[adj.surface];
            
            switch (adj.type) {
                case 'thickness':
                    surface.thickness = adj.newValue;
                    break;
                case 'radius':
                    surface.radius = adj.newValue;
                    break;
                case 'aspheric':
                    if (!surface.asphericCoeffs) {
                        surface.asphericCoeffs = [0, 0, 0, 0];
                    }
                    surface.asphericCoeffs[adj.coeffIndex] = adj.newValue;
                    surface.type = 'aspheric';
                    break;
            }
        });
    }

    revertAdjustment(lensData, adjustments) {
        adjustments.forEach(adj => {
            const surface = lensData.surfaces[adj.surface];
            
            switch (adj.type) {
                case 'thickness':
                    surface.thickness = adj.oldValue;
                    break;
                case 'radius':
                    surface.radius = adj.oldValue;
                    break;
                case 'aspheric':
                    if (surface.asphericCoeffs) {
                        surface.asphericCoeffs[adj.coeffIndex] = adj.oldValue;
                    }
                    break;
            }
        });
    }

    restoreBestConfig(lensData) {
        if (this.bestConfig) {
            lensData.surfaces = JSON.parse(JSON.stringify(this.bestConfig.surfaces));
        }
    }

    formatAdjustment(adjustments) {
        return adjustments.map(adj => {
            const typeNames = {
                thickness: '厚度',
                radius: '曲率',
                aspheric: '非球面'
            };
            return `S${adj.surface + 1}${typeNames[adj.type]}`;
        }).join(', ') || '无';
    }

    logOptimization(type, message) {
        const logTypes = {
            'INFO': 'info',
            'SUCCESS': 'success',
            'WARNING': 'warning',
            'ERROR': 'error'
        };
        
        if (typeof window === 'object' && window.addOptimizationLog) {
            window.addOptimizationLog(logTypes[type] || 'info', message);
        }
    }

    pause() {
        this.isPaused = true;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getImprovementHistory() {
        return this.improvementHistory;
    }

    getBestResults() {
        return {
            rms: this.bestRMS,
            mtf: this.bestMTF,
            config: this.bestConfig
        };
    }

    analyzeDominantAberration() {
        const aberrations = this.system.calculateAberrations(0);
        let maxAberration = 'spherical';
        let maxValue = 0;

        Object.entries(aberrations).forEach(([type, value]) => {
            if (value > maxValue) {
                maxValue = value;
                maxAberration = type;
            }
        });

        return {
            type: maxAberration,
            value: maxValue,
            recommendation: this.getRecommendation(maxAberration)
        };
    }

    getRecommendation(aberrationType) {
        const recommendations = {
            spherical: '建议调整镜片曲率半径或引入非球面系数',
            coma: '建议调整镜片间距或使用对称结构',
            astigmatism: '建议检查镜片倾斜或调整像散补偿片',
            fieldCurvature: '建议调整场镜或使用平场镜片组',
            distortion: '建议调整光阑位置或使用畸变补偿片'
        };
        return recommendations[aberrationType] || '建议综合优化';
    }
}
