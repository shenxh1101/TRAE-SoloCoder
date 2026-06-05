class ReportGenerator {
    constructor() {
        this.jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
    }

    async generatePDFReport(task) {
        if (!this.jsPDF) {
            this.jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
            if (!this.jsPDF) {
                alert('PDF库加载中，请稍后重试');
                return;
            }
        }

        const doc = new this.jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('光学系统设计分析报告', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`生成时间: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('一、任务概述', 20, yPosition);
        yPosition += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        const overviewData = [
            ['任务名称', task.name || '未命名'],
            ['创建时间', new Date(task.createdAt).toLocaleString()],
            ['状态', STATUS_LABELS[task.status] || task.status],
            ['优化迭代次数', `${task.iterations || 0} 次`],
            ['像质评分', `${task.qualityScore || 0} 分`],
            ['是否达标', task.meetsRequirements ? '是' : '否']
        ];

        overviewData.forEach(([label, value]) => {
            doc.text(label, 25, yPosition);
            doc.text(String(value), 80, yPosition);
            yPosition += 7;
        });

        yPosition += 10;
        if (yPosition > pageHeight - 50) {
            doc.addPage();
            yPosition = 20;
        }

        if (task.analysisResults) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('二、光学性能指标', 20, yPosition);
            yPosition += 10;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            const overall = task.analysisResults.overall;
            const metricsData = [
                ['波前RMS', `${overall.avgRmsWavefront.toFixed(4)} λ`],
                ['MTF截止频率', `${overall.avgMTFCutoff.toFixed(1)} lp/mm`],
                ['光斑RMS', `${overall.avgRmsSpot.toFixed(3)} µm`],
                ['轴上波前RMS', `${overall.onAxisRms.toFixed(4)} λ`],
                ['全视场波前RMS', `${overall.fullFieldRms.toFixed(4)} λ`]
            ];

            metricsData.forEach(([label, value]) => {
                doc.text(label, 25, yPosition);
                doc.text(String(value), 80, yPosition);
                yPosition += 7;
            });

            yPosition += 10;
            if (yPosition > pageHeight - 50) {
                doc.addPage();
                yPosition = 20;
            }
        }

        if (task.lensData && task.lensData.surfaces) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('三、透镜参数表', 20, yPosition);
            yPosition += 10;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            
            const headers = ['面号', '曲率半径(mm)', '厚度(mm)', '折射率', '直径(mm)'];
            const colWidths = [15, 30, 25, 20, 25];
            let xStart = 25;

            headers.forEach((header, i) => {
                doc.text(header, xStart, yPosition);
                xStart += colWidths[i];
            });
            yPosition += 6;

            task.lensData.surfaces.forEach((surface, index) => {
                if (yPosition > pageHeight - 30) {
                    doc.addPage();
                    yPosition = 20;
                }

                xStart = 25;
                const rowData = [
                    index + 1,
                    isFinite(surface.radius) ? surface.radius.toFixed(2) : '∞',
                    surface.thickness.toFixed(3),
                    surface.refractiveIndex.toFixed(3),
                    surface.diameter.toFixed(1)
                ];

                rowData.forEach((value, i) => {
                    doc.text(String(value), xStart, yPosition);
                    xStart += colWidths[i];
                });
                yPosition += 5;
            });

            yPosition += 10;
            if (yPosition > pageHeight - 50) {
                doc.addPage();
                yPosition = 20;
            }
        }

        if (task.optimizationHistory && task.optimizationHistory.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('四、优化历史', 20, yPosition);
            yPosition += 10;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            const optHeaders = ['迭代', '波前RMS(λ)', 'MTF(lp/mm)', '改进'];
            const optColWidths = [15, 30, 30, 20];
            let xOpt = 25;

            optHeaders.forEach((header, i) => {
                doc.text(header, xOpt, yPosition);
                xOpt += optColWidths[i];
            });
            yPosition += 6;

            task.optimizationHistory.slice(-15).forEach((step, idx) => {
                if (yPosition > pageHeight - 30) {
                    doc.addPage();
                    yPosition = 20;
                }

                xOpt = 25;
                const rowData = [
                    step.iteration,
                    step.rms.toFixed(4),
                    step.mtf.toFixed(1),
                    step.improved ? '✓' : '✗'
                ];

                rowData.forEach((value, i) => {
                    doc.text(String(value), xOpt, yPosition);
                    xOpt += optColWidths[i];
                });
                yPosition += 5;
            });
        }

        doc.addPage();
        yPosition = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('五、分析图表', 20, yPosition);
        yPosition += 10;

        const spotCanvas = document.getElementById('spotChart');
        if (spotCanvas) {
            try {
                const spotImg = spotCanvas.toDataURL('image/png');
                doc.addImage(spotImg, 'PNG', 20, yPosition, 80, 60);
                doc.setFontSize(10);
                doc.text('点列图', 60, yPosition + 65, { align: 'center' });
            } catch (e) {
                console.log('点列图截图失败');
            }
        }

        const mtfCanvas = document.getElementById('mtfChart');
        if (mtfCanvas) {
            try {
                const mtfImg = mtfCanvas.toDataURL('image/png');
                doc.addImage(mtfImg, 'PNG', 110, yPosition, 80, 60);
                doc.setFontSize(10);
                doc.text('MTF曲线', 150, yPosition + 65, { align: 'center' });
            } catch (e) {
                console.log('MTF曲线截图失败');
            }
        }

        yPosition += 80;

        const waveCanvas = document.getElementById('wavefrontChart');
        if (waveCanvas) {
            try {
                const waveImg = waveCanvas.toDataURL('image/png');
                doc.addImage(waveImg, 'PNG', 20, yPosition, 80, 60);
                doc.setFontSize(10);
                doc.text('波前图', 60, yPosition + 65, { align: 'center' });
            } catch (e) {
                console.log('波前图截图失败');
            }
        }

        const aberrationCanvas = document.getElementById('aberrationChart');
        if (aberrationCanvas) {
            try {
                const abImg = aberrationCanvas.toDataURL('image/png');
                doc.addImage(abImg, 'PNG', 110, yPosition, 80, 60);
                doc.setFontSize(10);
                doc.text('像差雷达图', 150, yPosition + 65, { align: 'center' });
            } catch (e) {
                console.log('像差雷达图截图失败');
            }
        }

        const fileName = `光学设计报告_${task.name}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);

        return fileName;
    }

    exportRayData(task) {
        if (!task || !task.lensData) {
            alert('没有可导出的数据');
            return;
        }

        const system = new OpticalSystem();
        system.loadFromData(task.lensData);

        const exportData = {
            taskName: task.name,
            exportTime: new Date().toISOString(),
            lensParameters: task.lensData,
            analysisResults: task.analysisResults,
            rays: []
        };

        system.fieldAngles.forEach(angle => {
            const rays = system.traceField(angle);
            exportData.rays.push({
                fieldAngle: angle,
                rays: rays.map(ray => ({
                    wavelength: ray.wavelength,
                    origin: [ray.origin.x, ray.origin.y, ray.origin.z],
                    direction: [ray.direction.x, ray.direction.y, ray.direction.z],
                    path: ray.path.map(p => ({
                        point: [p.point.x, p.point.y, p.point.z],
                        intensity: p.intensity
                    }))
                }))
            });
        });

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `光线数据_${task.name}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return exportData;
    }

    exportLensParameters(task) {
        if (!task || !task.lensData || !task.lensData.surfaces) {
            alert('没有可导出的数据');
            return;
        }

        let csv = '面号,曲率半径(mm),厚度(mm),折射率,直径(mm),圆锥系数,非球面系数\n';
        
        task.lensData.surfaces.forEach((surface, index) => {
            const row = [
                index + 1,
                isFinite(surface.radius) ? surface.radius.toFixed(4) : 'Infinity',
                surface.thickness.toFixed(4),
                surface.refractiveIndex.toFixed(4),
                surface.diameter.toFixed(2),
                (surface.conic || 0).toFixed(4),
                (surface.asphericCoeffs || [0, 0, 0, 0]).map(c => c.toExponential(4)).join(';')
            ];
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `透镜参数_${task.name}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generateCompareReport(tasks) {
        if (tasks.length < 2) {
            alert('请至少选择2个任务进行对比');
            return;
        }

        const compareData = tasks.map(task => ({
            name: task.name,
            results: task.analysisResults,
            qualityScore: task.qualityScore,
            iterations: task.iterations,
            meetsRequirements: task.meetsRequirements
        }));

        let report = '多组设计参数对比报告\n';
        report += '=' .repeat(50) + '\n\n';
        report += `对比时间: ${new Date().toLocaleString()}\n`;
        report += `对比任务数: ${tasks.length}\n\n`;

        report += '一、基本信息对比\n';
        report += '-'.repeat(50) + '\n';
        report += '任务名称\t状态\t迭代次数\t评分\t达标\n';
        compareData.forEach(d => {
            report += `${d.name}\t${d.status || '完成'}\t${d.iterations}\t${d.qualityScore}\t${d.meetsRequirements ? '是' : '否'}\n`;
        });
        report += '\n';

        report += '二、光学性能对比\n';
        report += '-'.repeat(50) + '\n';
        report += '任务名称\t波前RMS(λ)\tMTF截止(lp/mm)\t光斑RMS(µm)\n';
        compareData.forEach(d => {
            if (d.results && d.results.overall) {
                report += `${d.name}\t${d.results.overall.avgRmsWavefront.toFixed(4)}\t${d.results.overall.avgMTFCutoff.toFixed(1)}\t${d.results.overall.avgRmsSpot.toFixed(3)}\n`;
            }
        });
        report += '\n';

        report += '三、像差数据对比\n';
        report += '-'.repeat(50) + '\n';
        
        const aberrationNames = { spherical: '球差', coma: '彗差', astigmatism: '像散', fieldCurvature: '场曲', distortion: '畸变' };
        Object.keys(aberrationNames).forEach(abType => {
            report += `${aberrationNames[abType]}:\n`;
            compareData.forEach(d => {
                if (d.results && d.results.aberrations && d.results.aberrations[0]) {
                    report += `  ${d.name}: ${d.results.aberrations[0][abType].toFixed(2)}\n`;
                }
            });
        });

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `设计对比报告_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return report;
    }
}

const reportGenerator = new ReportGenerator();
