import ReactECharts from 'echarts-for-react';
import type { DepartmentStats, TimeRange, Department } from '../types';
import { getHeatmapData } from '../utils/calculations';

interface HeatmapChartProps {
  stats: DepartmentStats[];
  timeRange: TimeRange;
  departments?: Department[];
}

export default function HeatmapChart({ stats, timeRange, departments = [] }: HeatmapChartProps) {
  const { data, xAxis, yAxis } = getHeatmapData(stats, timeRange, departments);

  const option = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [x, y, value] = params.data;
        return `${yAxis[y]}<br/>${xAxis[x]}<br/>接诊量: <strong>${value}</strong> 人`;
      },
    },
    grid: {
      left: '12%',
      right: '5%',
      top: '5%',
      bottom: '15%',
    },
    xAxis: {
      type: 'category',
      data: xAxis,
      splitArea: { show: true },
      axisLabel: {
        fontSize: 11,
        color: '#6b7280',
      },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'category',
      data: yAxis,
      splitArea: { show: true },
      axisLabel: {
        fontSize: 12,
        color: '#374151',
        fontWeight: 500,
      },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    visualMap: {
      min: 0,
      max: 300,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
      },
      textStyle: {
        color: '#6b7280',
        fontSize: 11,
      },
    },
    series: [
      {
        name: '接诊量',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          fontSize: 10,
          color: '#1f2937',
          formatter: (params: any) => params.data[2],
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">各科室接诊量热力图</h3>
          <p className="text-sm text-gray-500 mt-1">按时间维度展示各科室接诊情况</p>
        </div>
      </div>
      <ReactECharts
        option={option}
        style={{ height: '450px' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
