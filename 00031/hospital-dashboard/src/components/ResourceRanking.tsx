import ReactECharts from 'echarts-for-react';
import type { DepartmentStats, TimeRange } from '../types';

interface ResourceRankingProps {
  stats: DepartmentStats[];
  timeRange: TimeRange;
}

export default function ResourceRanking({ stats, timeRange }: ResourceRankingProps) {
  const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
  
  const avgStats = Array.from(new Set(stats.map(s => s.departmentName))).map(deptName => {
    const deptStats = stats.filter(s => s.departmentName === deptName).slice(0, days);
    return {
      name: deptName,
      utilization: Math.round(
        deptStats.reduce((acc, s) => acc + s.resourceUtilization, 0) / deptStats.length
      ),
      saturation: Math.round(
        deptStats.reduce((acc, s) => acc + s.saturation, 0) / deptStats.length
      ),
      totalPatients: deptStats.reduce((acc, s) => acc + s.totalRegistrations, 0),
    };
  }).sort((a, b) => b.utilization - a.utilization);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0];
        const stat = avgStats.find(s => s.name === data.name);
        return `${data.name}<br/>
                资源利用率: <strong>${data.value}%</strong><br/>
                科室饱和度: ${stat?.saturation}%<br/>
                总接诊量: ${stat?.totalPatients} 人`;
      },
    },
    grid: {
      left: '3%',
      right: '8%',
      top: '5%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%',
        color: '#6b7280',
        fontSize: 11,
      },
      splitLine: {
        lineStyle: { color: '#f3f4f6', type: 'dashed' },
      },
    },
    yAxis: {
      type: 'category',
      data: avgStats.map(s => s.name),
      axisLabel: {
        color: '#374151',
        fontSize: 12,
        fontWeight: 500,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: '资源利用率',
        type: 'bar',
        data: avgStats.map(s => ({
          value: s.utilization,
          itemStyle: {
            color: s.utilization >= 90 
              ? '#ef4444' 
              : s.utilization >= 75 
                ? '#f59e0b' 
                : s.utilization >= 60 
                  ? '#3b82f6' 
                  : '#94a3b8',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 20,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#374151',
          fontSize: 12,
          fontWeight: 500,
        },
      },
    ],
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">资源利用率排名</h3>
          <p className="text-sm text-gray-500 mt-1">各科室资源利用效率对比</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded bg-red-500 mr-1"></span>
            <span className="text-gray-600">高负荷 (≥90%)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded bg-yellow-500 mr-1"></span>
            <span className="text-gray-600">正常 (75-89%)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded bg-blue-500 mr-1"></span>
            <span className="text-gray-600">良好 (60-74%)</span>
          </div>
        </div>
      </div>
      <ReactECharts
        option={option}
        style={{ height: '400px' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
