import { useState } from 'react';
import { FileBarChart, Download, TrendingUp, AlertTriangle, Car, Bus, Clock } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { mockDailyReport } from '@/data/mockData';

type ReportType = 'daily' | 'weekly' | 'monthly';

const reportTypeNames: Record<ReportType, string> = {
  daily: '日报',
  weekly: '周报',
  monthly: '月报',
};

export default function ReportPanel() {
  const [activeTab, setActiveTab] = useState<ReportType>('daily');

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const overviewData = [
      ['指标', '数值'],
      ['日期', mockDailyReport.date],
      ['总流量', mockDailyReport.totalTrafficVolume],
      ['公交准点率', `${mockDailyReport.busOnTimeRate}%`],
      ['事故总数', mockDailyReport.totalAccidents],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, ws1, '概览');

    const intersectionData = [
      ['路口名称', '平均延误(s)', '事故数', '峰值流量'],
      ...mockDailyReport.intersections.map((i) => [
        i.name,
        i.avgDelay,
        i.accidents,
        i.peakFlow,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(intersectionData);
    XLSX.utils.book_append_sheet(wb, ws2, '路口明细');

    XLSX.writeFile(wb, `交通报表_${mockDailyReport.date}.xlsx`);
  };

  const lineChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13, 17, 23, 0.9)',
      borderColor: 'rgba(56, 139, 253, 0.3)',
      textStyle: { color: '#a5f3fc' },
    },
    legend: {
      data: ['交通流量', '平均速度'],
      textStyle: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      axisLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.3)' } },
      axisLabel: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: '流量',
        nameTextStyle: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.3)' } },
        axisLabel: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.1)' } },
      },
      {
        type: 'value',
        name: '速度(km/h)',
        nameTextStyle: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.3)' } },
        axisLabel: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '交通流量',
        type: 'bar',
        data: [5000, 2000, 15000, 10000, 18000, 12000, 6000],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.2)' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '平均速度',
        type: 'line',
        yAxisIndex: 1,
        data: [45, 55, 25, 35, 20, 30, 42],
        smooth: true,
        lineStyle: { color: '#22c55e', width: 2 },
        itemStyle: { color: '#22c55e' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34, 197, 94, 0.3)' },
              { offset: 1, color: 'rgba(34, 197, 94, 0)' },
            ],
          },
        },
      },
    ],
  };

  const pieChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(13, 17, 23, 0.9)',
      borderColor: 'rgba(56, 139, 253, 0.3)',
      textStyle: { color: '#a5f3fc' },
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
    },
    series: [
      {
        name: '流量分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#0D1117',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            color: '#a5f3fc',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: 35, name: '东西直行', itemStyle: { color: '#38bdf8' } },
          { value: 30, name: '南北直行', itemStyle: { color: '#22c55e' } },
          { value: 20, name: '左转', itemStyle: { color: '#a855f7' } },
          { value: 15, name: '右转', itemStyle: { color: '#f97316' } },
        ],
      },
    ],
  };

  const delayChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13, 17, 23, 0.9)',
      borderColor: 'rgba(56, 139, 253, 0.3)',
      textStyle: { color: '#a5f3fc' },
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.3)' } },
      axisLabel: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.1)' } },
    },
    yAxis: {
      type: 'category',
      data: mockDailyReport.intersections.map((i) => i.name.split('').slice(0, 6).join('')),
      axisLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.3)' } },
      axisLabel: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 9 },
    },
    series: [
      {
        name: '平均延误(s)',
        type: 'bar',
        data: mockDailyReport.intersections.map((i) => i.avgDelay),
        itemStyle: {
          color: (params: { data: number }) => {
            if (params.data > 20) return '#ef4444';
            if (params.data > 15) return '#f97316';
            return '#22c55e';
          },
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-cyan-300 font-display tracking-wide">报表中心</h3>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 rounded bg-green-500/20 border border-green-500/50 text-green-300 hover:bg-green-500/30 transition-all duration-300"
        >
          <Download className="w-4 h-4" />
          导出 Excel
        </button>
      </div>

      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly'] as ReportType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={cn(
              "px-4 py-2 rounded text-sm transition-all duration-300",
              "border",
              activeTab === type
                ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-cyber"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-500/70 hover:bg-cyan-500/20"
            )}
          >
            {reportTypeNames[type]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="p-4 rounded border border-cyan-500/30 bg-cyan-500/10">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-400/70">总流量</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {mockDailyReport.totalTrafficVolume.toLocaleString()}
          </div>
          <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +8.5% 同比
          </div>
        </div>
        <div className="p-4 rounded border border-green-500/30 bg-green-500/10">
          <div className="flex items-center gap-2 mb-2">
            <Bus className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400/70">公交准点率</span>
          </div>
          <div className="text-2xl font-bold font-mono text-green-300">
            {mockDailyReport.busOnTimeRate}%
          </div>
          <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +2.3% 环比
          </div>
        </div>
        <div className="p-4 rounded border border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400/70">事故总数</span>
          </div>
          <div className="text-2xl font-bold font-mono text-red-300">
            {mockDailyReport.totalAccidents}
          </div>
          <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 rotate-180" />
            -15% 同比
          </div>
        </div>
        <div className="p-4 rounded border border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-400/70">平均延误</span>
          </div>
          <div className="text-2xl font-bold font-mono text-yellow-300">
            13.2s
          </div>
          <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +5.2% 环比
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
          <h4 className="text-sm font-medium text-cyan-300 mb-3">24小时流量趋势</h4>
          <div className="h-56">
            <ReactECharts option={lineChartOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
          <h4 className="text-sm font-medium text-cyan-300 mb-3">路口流量分布</h4>
          <div className="h-56">
            <ReactECharts option={pieChartOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
        <h4 className="text-sm font-medium text-cyan-300 mb-3">各路口平均延误排行</h4>
        <div className="h-64">
          <ReactECharts option={delayChartOption} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>

      <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
        <h4 className="text-sm font-medium text-cyan-300 mb-3">详细数据</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyber-border">
                <th className="text-left py-2 px-3 text-cyan-400/70 font-medium">路口名称</th>
                <th className="text-center py-2 px-3 text-cyan-400/70 font-medium">平均延误(s)</th>
                <th className="text-center py-2 px-3 text-cyan-400/70 font-medium">事故数</th>
                <th className="text-center py-2 px-3 text-cyan-400/70 font-medium">峰值流量</th>
                <th className="text-center py-2 px-3 text-cyan-400/70 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {mockDailyReport.intersections.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-cyber-border/50 hover:bg-cyan-500/5 transition-colors"
                >
                  <td className="py-2 px-3 text-cyan-200">{item.name}</td>
                  <td className="py-2 px-3 text-center font-mono">
                    <span className={cn(
                      item.avgDelay > 20 ? 'text-red-400' :
                      item.avgDelay > 15 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {item.avgDelay}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    <span className={cn(
                      item.accidents > 3 ? 'text-red-400' :
                      item.accidents > 0 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {item.accidents}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-cyan-300">
                    {item.peakFlow}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded border",
                      item.avgDelay > 20
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : item.avgDelay > 15
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-green-500/20 text-green-400 border-green-500/30"
                    )}>
                      {item.avgDelay > 20 ? '拥堵' : item.avgDelay > 15 ? '缓行' : '畅通'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
