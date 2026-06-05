import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { TestReport } from '@/types';

interface TestReportChartProps {
  reports: TestReport[];
}

export const TestReportChart: React.FC<TestReportChartProps> = ({ reports }) => {
  const chartData = reports.map(report => ({
    date: report.testDate.slice(5),
    血红蛋白: Number(report.hemoglobin.toFixed(1)),
    红细胞压积: Number((report.hematocrit * 100).toFixed(1)),
    血小板计数: Number(report.plateletCount.toFixed(0)),
    白细胞计数: Number(report.wbcCount.toFixed(1))
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 border border-slate-600 rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-slate-300 text-xs mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.name === '红细胞压积' ? '%' : entry.name === '血小板计数' ? '×10⁹/L' : entry.name === '白细胞计数' ? '×10⁹/L' : 'g/L'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">血红蛋白 (g/L)</h4>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorHb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#165DFF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#165DFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} domain={[110, 160]} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="血红蛋白"
              stroke="#165DFF"
              strokeWidth={2}
              fill="url(#colorHb)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">红细胞压积 (%)</h4>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorHct" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00B42A" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00B42A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} domain={[35, 50]} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="红细胞压积"
              stroke="#00B42A"
              strokeWidth={2}
              fill="url(#colorHct)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">血小板计数 (×10⁹/L)</h4>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} domain={[150, 300]} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="血小板计数"
              stroke="#722ED1"
              strokeWidth={2}
              dot={{ fill: '#722ED1', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">白细胞计数 (×10⁹/L)</h4>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} domain={[4, 11]} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="白细胞计数"
              stroke="#F53F3F"
              strokeWidth={2}
              dot={{ fill: '#F53F3F', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
