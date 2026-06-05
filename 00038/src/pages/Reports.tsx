import React, { useState, useMemo } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  Simulation,
  PLASMA_TYPE_LABELS,
  BOUNDARY_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
} from '../../shared/types';
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  FileDown,
  CheckCircle2,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';
import { formatScientific, formatTime } from '../utils/plasmaUtils';
import * as Select from '@radix-ui/react-select';

interface QueryFilters {
  search: string;
  status: string;
  plasmaType: string;
  dateFrom: string;
  dateTo: string;
  minFusionPower: string;
}

const LOCATION_LABELS: Record<string, string> = {
  INNER: '内边界',
  OUTER: '外边界',
  TOP: '上边界',
  BOTTOM: '下边界',
};

function getFieldStats(field: number[][][]) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < field.length; i++) {
    for (let j = 0; j < field[i].length; j++) {
      for (let k = 0; k < field[i][j].length; k++) {
        const v = field[i][j][k];
        if (v < min) min = v;
        if (v > max) max = v;
        sum += v;
        count++;
      }
    }
  }
  return { min, max, avg: count > 0 ? sum / count : 0 };
}

export default function Reports() {
  const { simulations } = useSimulationStore();
  const [filters, setFilters] = useState<QueryFilters>({
    search: '',
    status: 'ALL',
    plasmaType: 'ALL',
    dateFrom: '',
    dateTo: '',
    minFusionPower: '',
  });
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredSimulations = useMemo(() => {
    return simulations.filter((sim) => {
      if (filters.search && !sim.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.status !== 'ALL' && sim.status !== filters.status) return false;
      if (filters.plasmaType !== 'ALL' && sim.plasmaType !== filters.plasmaType) return false;
      if (filters.dateFrom && new Date(sim.createdAt) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(sim.createdAt) > new Date(filters.dateTo + 'T23:59:59')) return false;
      if (filters.minFusionPower && sim.result?.fusionPower < parseFloat(filters.minFusionPower)) return false;
      return true;
    });
  }, [simulations, filters]);

  const handleFilterChange = (key: keyof QueryFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredSimulations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSimulations.map((s) => s.id));
    }
  };

  const handleExportPDF = async () => {
    if (selectedIds.length === 0) return;
    setExporting(true);

    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const bottomLimit = pageHeight - 15;

      const checkPageBreak = (yPos: number, needed: number): number => {
        if (yPos + needed > bottomLimit) {
          doc.addPage();
          return 20;
        }
        return yPos;
      };

      const selectedSims = simulations.filter((s) => selectedIds.includes(s.id));

      doc.setFontSize(20);
      doc.setTextColor(99, 102, 241);
      doc.text('等离子体模拟综合报告', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, pageWidth / 2, 30, { align: 'center' });
      doc.text(`共 ${selectedSims.length} 个模拟工况`, pageWidth / 2, 37, { align: 'center' });

      let yPos = 50;

      selectedSims.forEach((sim, index) => {
        yPos = checkPageBreak(yPos, 60);

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`工况 ${index + 1}: ${sim.name}`, margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(`类型: ${PLASMA_TYPE_LABELS[sim.plasmaType]}`, margin + 6, yPos);
        yPos += 6;
        doc.text(`状态: ${sim.status}`, margin + 6, yPos);
        yPos += 6;
        doc.text(`创建时间: ${new Date(sim.createdAt).toLocaleString('zh-CN')}`, margin + 6, yPos);
        yPos += 6;
        doc.text(`磁场强度: ${sim.parameters.magneticField} T`, margin + 6, yPos);
        yPos += 6;
        doc.text(`等离子体电流: ${sim.parameters.plasmaCurrent} MA`, margin + 6, yPos);
        yPos += 6;
        doc.text(`大半径: ${sim.parameters.majorRadius} m  小半径: ${sim.parameters.minorRadius} m`, margin + 6, yPos);
        yPos += 8;

        yPos = checkPageBreak(yPos, 10 + sim.boundaryConditions.length * 6 + 4);
        doc.setFontSize(11);
        doc.setTextColor(99, 102, 241);
        doc.text('边界条件概要', margin, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setTextColor(60);
        if (sim.boundaryConditions.length === 0) {
          doc.text('  无边界条件', margin + 4, yPos);
          yPos += 6;
        } else {
          sim.boundaryConditions.forEach((bc) => {
            const typeLabel = BOUNDARY_TYPE_LABELS[bc.type] || bc.type;
            const locLabel = LOCATION_LABELS[bc.location] || bc.location;
            doc.text(`  ${bc.name} | 类型: ${typeLabel} | 位置: ${locLabel} | 值: ${bc.value}`, margin + 4, yPos);
            yPos += 5;
          });
        }
        yPos += 4;

        yPos = checkPageBreak(yPos, 10 + sim.sourceTerms.length * 6 + 4);
        doc.setFontSize(11);
        doc.setTextColor(99, 102, 241);
        doc.text('源项概要', margin, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setTextColor(60);
        if (sim.sourceTerms.length === 0) {
          doc.text('  无源项', margin + 4, yPos);
          yPos += 6;
        } else {
          sim.sourceTerms.forEach((st) => {
            const typeLabel = SOURCE_TYPE_LABELS[st.type] || st.type;
            doc.text(`  ${st.name} | 类型: ${typeLabel} | 幅度: ${st.amplitude}`, margin + 4, yPos);
            yPos += 5;
          });
        }
        yPos += 4;

        if (sim.result) {
          const densityStats = getFieldStats(sim.result.finalDensity);
          yPos = checkPageBreak(yPos, 24);
          doc.setFontSize(11);
          doc.setTextColor(99, 102, 241);
          doc.text('密度分布概要', margin, yPos);
          yPos += 6;
          doc.setFontSize(9);
          doc.setTextColor(0);
          doc.text(`  最小值: ${formatScientific(densityStats.min)} m⁻³`, margin + 4, yPos);
          yPos += 5;
          doc.text(`  平均值: ${formatScientific(densityStats.avg)} m⁻³`, margin + 4, yPos);
          yPos += 5;
          doc.text(`  最大值: ${formatScientific(densityStats.max)} m⁻³`, margin + 4, yPos);
          yPos += 7;

          const tempStats = getFieldStats(sim.result.finalTemperature);
          yPos = checkPageBreak(yPos, 24);
          doc.setFontSize(11);
          doc.setTextColor(99, 102, 241);
          doc.text('温度分布概要', margin, yPos);
          yPos += 6;
          doc.setFontSize(9);
          doc.setTextColor(0);
          doc.text(`  最小值: ${formatScientific(tempStats.min)} K`, margin + 4, yPos);
          yPos += 5;
          doc.text(`  平均值: ${formatScientific(tempStats.avg)} K`, margin + 4, yPos);
          yPos += 5;
          doc.text(`  最大值: ${formatScientific(tempStats.max)} K`, margin + 4, yPos);
          yPos += 7;

          const tsData = sim.result.timeSeriesData;
          if (tsData && tsData.length > 0) {
            const showCount = Math.min(5, tsData.length);
            const neededHeight = 10 + showCount * 5 + 4;
            yPos = checkPageBreak(yPos, neededHeight);
            doc.setFontSize(11);
            doc.setTextColor(99, 102, 241);
            doc.text('时序数据（前5个时间点）', margin, yPos);
            yPos += 6;
            doc.setFontSize(8);
            doc.setTextColor(60);
            doc.text('  时间            增长率        平均密度          平均温度          储能(MJ)', margin + 2, yPos);
            yPos += 5;
            doc.setTextColor(0);
            for (let t = 0; t < showCount; t++) {
              const d = tsData[t];
              const line = `  ${formatTime(d.time).padEnd(12)} ${d.growthRate.toFixed(4).padEnd(14)} ${formatScientific(d.averageDensity).padEnd(18)} ${formatScientific(d.averageTemperature).padEnd(18)} ${d.storedEnergy.toFixed(3)}`;
              doc.text(line, margin + 2, yPos);
              yPos += 5;
            }
            yPos += 4;
          }

          const targets = sim.result.performanceTargets;
          yPos = checkPageBreak(yPos, 50);
          doc.setFontSize(11);
          doc.setTextColor(99, 102, 241);
          doc.text('性能指标与目标对比', margin, yPos);
          yPos += 7;

          doc.setFontSize(9);
          doc.setTextColor(60);
          const colX = [margin + 4, margin + 60, margin + 110, margin + 160, margin + 200];
          doc.text('指标', colX[0], yPos);
          doc.text('目标值', colX[1], yPos);
          doc.text('实际值', colX[2], yPos);
          doc.text('结果', colX[3], yPos);
          yPos += 2;
          doc.setDrawColor(180);
          doc.line(colX[0], yPos, colX[4], yPos);
          yPos += 4;

          const passFail = (actual: number, target: number, higherBetter: boolean) => {
            const pass = higherBetter ? actual >= target : actual <= target;
            return pass ? 'PASS' : 'FAIL';
          };

          const rows: [string, number, number, boolean][] = [
            ['约束时间 (s)', targets.targetConfinementTime, sim.result.confinementTime, true],
            ['聚变功率 (MW)', targets.targetFusionPower, sim.result.fusionPower, true],
            ['beta值 (%)', targets.targetBetaValue, sim.result.betaValue, true],
            ['稳定裕度', targets.targetStabilityMargin, sim.result.stabilityMargin, true],
          ];

          rows.forEach(([label, target, actual, higherBetter]) => {
            yPos = checkPageBreak(yPos, 8);
            const result = passFail(actual, target, higherBetter);
            doc.setTextColor(0);
            doc.text(label, colX[0], yPos);
            doc.text(typeof target === 'number' ? (label.includes('%') ? target.toFixed(2) : target.toFixed(2)) : String(target), colX[1], yPos);
            doc.text(label.includes('%') ? actual.toFixed(2) : actual.toFixed(2), colX[2], yPos);
            if (result === 'PASS') {
              doc.setTextColor(34, 139, 34);
              doc.text('PASS', colX[3], yPos);
            } else {
              doc.setTextColor(220, 20, 60);
              doc.text('FAIL', colX[3], yPos);
            }
            doc.setTextColor(0);
            yPos += 6;
          });
          yPos += 4;

          yPos = checkPageBreak(yPos, 18);
          doc.setFontSize(9);
          doc.setTextColor(80);
          doc.text(`β值: ${sim.result.betaValue.toFixed(2)}%  (目标: ${targets.targetBetaValue.toFixed(2)}%)`, margin + 4, yPos);
          yPos += 6;
          doc.text(`稳定裕度: ${sim.result.stabilityMargin.toFixed(2)}  (目标: ${targets.targetStabilityMargin.toFixed(2)})`, margin + 4, yPos);
          yPos += 6;
          doc.text(`能量约束: ${sim.result.energyConfinement.toFixed(2)} MJ`, margin + 4, yPos);
          yPos += 6;
        }

        yPos += 4;
        doc.setDrawColor(200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
      });

      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.setTextColor(99, 102, 241);
      doc.text('汇总统计', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      const completedSims = selectedSims.filter((s) => s.result);
      const totalSims = selectedSims.length;
      const completedCount = completedSims.length;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`总工况数: ${totalSims}`, margin + 4, yPos);
      yPos += 6;
      doc.text(`已完成工况数: ${completedCount}`, margin + 4, yPos);
      yPos += 6;
      doc.text(`未完成工况数: ${totalSims - completedCount}`, margin + 4, yPos);
      yPos += 10;

      if (completedSims.length > 0) {
        const confinementTimes = completedSims.map((s) => s.result!.confinementTime);
        const fusionPowers = completedSims.map((s) => s.result!.fusionPower);
        const betaValues = completedSims.map((s) => s.result!.betaValue);
        const stabilityMargins = completedSims.map((s) => s.result!.stabilityMargin);
        const energyConfinements = completedSims.map((s) => s.result!.energyConfinement);

        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
        const min = (arr: number[]) => Math.min(...arr);
        const max = (arr: number[]) => Math.max(...arr);

        yPos = checkPageBreak(yPos, 80);

        doc.setFontSize(12);
        doc.setTextColor(99, 102, 241);
        doc.text('性能指标汇总', margin, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setTextColor(60);
        const sumColX = [margin + 4, margin + 65, margin + 120, margin + 175, margin + 220];
        doc.text('指标', sumColX[0], yPos);
        doc.text('最小值', sumColX[1], yPos);
        doc.text('平均值', sumColX[2], yPos);
        doc.text('最大值', sumColX[3], yPos);
        yPos += 2;
        doc.setDrawColor(180);
        doc.line(sumColX[0], yPos, sumColX[4], yPos);
        yPos += 5;

        doc.setTextColor(0);
        const summaryRows: [string, number[]][] = [
          ['约束时间 (s)', confinementTimes],
          ['聚变功率 (MW)', fusionPowers],
          ['β值 (%)', betaValues],
          ['稳定裕度', stabilityMargins],
          ['能量约束 (MJ)', energyConfinements],
        ];

        summaryRows.forEach(([label, values]) => {
          yPos = checkPageBreak(yPos, 8);
          doc.text(label, sumColX[0], yPos);
          doc.text(min(values).toFixed(3), sumColX[1], yPos);
          doc.text(avg(values).toFixed(3), sumColX[2], yPos);
          doc.text(max(values).toFixed(3), sumColX[3], yPos);
          yPos += 6;
        });
        yPos += 8;

        yPos = checkPageBreak(yPos, 30);
        const passCount = completedSims.filter((s) => {
          const t = s.result!.performanceTargets;
          return (
            s.result!.confinementTime >= t.targetConfinementTime &&
            s.result!.fusionPower >= t.targetFusionPower &&
            s.result!.betaValue >= t.targetBetaValue &&
            s.result!.stabilityMargin >= t.targetStabilityMargin
          );
        }).length;

        doc.setFontSize(11);
        doc.setTextColor(99, 102, 241);
        doc.text('目标达成率', margin, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setTextColor(0);
        const passRate = completedCount > 0 ? ((passCount / completedCount) * 100).toFixed(1) : '0.0';
        doc.text(`全部达标工况数: ${passCount} / ${completedCount}  (${passRate}%)`, margin + 4, yPos);
        yPos += 8;

        const targetLabels = ['约束时间', '聚变功率', 'β值', '稳定裕度'];
        const targetPassCounts = [
          completedSims.filter((s) => s.result!.confinementTime >= s.result!.performanceTargets.targetConfinementTime).length,
          completedSims.filter((s) => s.result!.fusionPower >= s.result!.performanceTargets.targetFusionPower).length,
          completedSims.filter((s) => s.result!.betaValue >= s.result!.performanceTargets.targetBetaValue).length,
          completedSims.filter((s) => s.result!.stabilityMargin >= s.result!.performanceTargets.targetStabilityMargin).length,
        ];

        targetLabels.forEach((label, i) => {
          yPos = checkPageBreak(yPos, 8);
          const rate = completedCount > 0 ? ((targetPassCounts[i] / completedCount) * 100).toFixed(1) : '0.0';
          doc.text(`  ${label}: ${targetPassCounts[i]}/${completedCount} 达标 (${rate}%)`, margin + 4, yPos);
          yPos += 6;
        });

        yPos += 10;
        yPos = checkPageBreak(yPos, 30);
        const typeCounts: Record<string, number> = {};
        selectedSims.forEach((s) => {
          const label = PLASMA_TYPE_LABELS[s.plasmaType];
          typeCounts[label] = (typeCounts[label] || 0) + 1;
        });

        doc.setFontSize(11);
        doc.setTextColor(99, 102, 241);
        doc.text('工况类型分布', margin, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setTextColor(0);
        Object.entries(typeCounts).forEach(([type, count]) => {
          yPos = checkPageBreak(yPos, 8);
          doc.text(`  ${type}: ${count} 个`, margin + 4, yPos);
          yPos += 6;
        });
      }

      doc.save(`等离子体模拟报告_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF生成失败:', error);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'ALL',
      plasmaType: 'ALL',
      dateFrom: '',
      dateTo: '',
      minFusionPower: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-text-primary">
            查询与报告
          </h2>
          <p className="text-text-secondary mt-1">
            按条件查询模拟任务并导出综合报告
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-tertiary">
            已选择 {selectedIds.length} / {filteredSimulations.length}
          </span>
          <button
            onClick={handleExportPDF}
            disabled={selectedIds.length === 0 || exporting}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <FileDown size={18} />
                导出PDF报告
              </>
            )}
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-primary" />
          <h3 className="section-title">筛选条件</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="input-label">关键词搜索</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="任务名称..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field pl-9"
              />
            </div>
          </div>

          <div>
            <label className="input-label">任务状态</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-field"
            >
              <option value="ALL">全部状态</option>
              <option value="COMPLETED">已完成</option>
              <option value="COMPUTING">计算中</option>
              <option value="PAUSED">已暂停</option>
              <option value="FAILED">失败</option>
            </select>
          </div>

          <div>
            <label className="input-label">等离子体类型</label>
            <select
              value={filters.plasmaType}
              onChange={(e) => handleFilterChange('plasmaType', e.target.value)}
              className="input-field"
            >
              <option value="ALL">全部类型</option>
              <option value="TOKAMAK">托克马克</option>
              <option value="STELLARATOR">仿星器</option>
              <option value="INERTIAL">惯性约束</option>
            </select>
          </div>

          <div>
            <label className="input-label flex items-center gap-1">
              <Calendar size={12} />
              开始日期
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="input-label flex items-center gap-1">
              <Calendar size={12} />
              结束日期
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="input-label">最小聚变功率 (MW)</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minFusionPower}
              onChange={(e) => handleFilterChange('minFusionPower', e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-border">
          <button onClick={clearFilters} className="btn-secondary mr-2">
            重置筛选
          </button>
          <span className="text-sm text-text-tertiary self-center mr-4">
            共 {filteredSimulations.length} 条结果
          </span>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                selectedIds.length === filteredSimulations.length && filteredSimulations.length > 0
                  ? 'bg-primary border-primary'
                  : 'border-border'
              )}
            >
              {selectedIds.length === filteredSimulations.length &&
                filteredSimulations.length > 0 && <CheckCircle2 size={14} className="text-white" />}
            </button>
            <span className="text-sm text-text-secondary">全选</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background-tertiary/50">
              <tr>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  选择
                </th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  任务名称
                </th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  类型
                </th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  状态
                </th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  约束时间
                </th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  聚变功率
                </th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  β值
                </th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  创建时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredSimulations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-tertiary">
                    暂无符合条件的模拟任务
                  </td>
                </tr>
              ) : (
                filteredSimulations.map((sim) => (
                  <SimulationRow
                    key={sim.id}
                    simulation={sim}
                    selected={selectedIds.includes(sim.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface SimulationRowProps {
  simulation: Simulation;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

const SimulationRow: React.FC<SimulationRowProps> = ({ simulation, selected, onToggleSelect }) => {
  return (
    <tr
      className={cn(
        'hover:bg-background-tertiary/30 transition-colors cursor-pointer',
        selected && 'bg-primary/5'
      )}
      onClick={() => onToggleSelect(simulation.id)}
    >
      <td className="py-3 px-4">
        <div
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
            selected ? 'bg-primary border-primary' : 'border-border hover:border-primary/50'
          )}
        >
          {selected && <CheckCircle2 size={14} className="text-white" />}
        </div>
      </td>
      <td className="py-3 px-4">
        <p className="font-medium text-text-primary">{simulation.name}</p>
        <p className="text-xs text-text-tertiary">{simulation.modelType}</p>
      </td>
      <td className="py-3 px-4 text-text-secondary">
        {PLASMA_TYPE_LABELS[simulation.plasmaType]}
      </td>
      <td className="py-3 px-4">
        <StatusBadge status={simulation.status} size="sm" />
      </td>
      <td className="py-3 px-4 font-mono text-text-primary">
        {simulation.result
          ? formatTime(simulation.result.confinementTime)
          : '-'}
      </td>
      <td className="py-3 px-4 font-mono text-text-primary">
        {simulation.result
          ? `${simulation.result.fusionPower.toFixed(1)} MW`
          : '-'}
      </td>
      <td className="py-3 px-4 font-mono text-text-primary">
        {simulation.result ? `${simulation.result.betaValue.toFixed(2)}%` : '-'}
      </td>
      <td className="py-3 px-4 text-text-tertiary font-mono text-xs">
        {new Date(simulation.createdAt).toLocaleDateString('zh-CN')}
      </td>
    </tr>
  );
};
