import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const completionData = [
  { month: '1月', rate: 78, target: 85 },
  { month: '2月', rate: 82, target: 85 },
  { month: '3月', rate: 79, target: 85 },
  { month: '4月', rate: 85, target: 85 },
  { month: '5月', rate: 88, target: 85 },
  { month: '6月', rate: 87.5, target: 85 },
];

const responseTimeData = [
  { week: 'W1', time: 320, threshold: 300 },
  { week: 'W2', time: 285, threshold: 300 },
  { week: 'W3', time: 260, threshold: 300 },
  { week: 'W4', time: 245, threshold: 300 },
];

export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">月度完成率趋势</h3>
          <span className="text-xs font-mono text-acoustic-cyber bg-acoustic-cyber/10 px-3 py-1 rounded-full">
            近6个月
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={completionData}>
            <defs>
              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
            <XAxis dataKey="month" stroke="#718096" fontSize={12} />
            <YAxis stroke="#718096" fontSize={12} domain={[60, 100]} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0D1B2A',
                border: '1px solid #2D3748',
                borderRadius: '8px',
                color: '#E2E8F0',
              }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#00D4FF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRate)"
              name="完成率"
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#00C853"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="目标值"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">预警响应时间</h3>
          <span className="text-xs font-mono text-acoustic-success bg-acoustic-success/10 px-3 py-1 rounded-full">
            目标 &lt;5分钟
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={responseTimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
            <XAxis dataKey="week" stroke="#718096" fontSize={12} />
            <YAxis stroke="#718096" fontSize={12} unit="秒" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0D1B2A',
                border: '1px solid #2D3748',
                borderRadius: '8px',
                color: '#E2E8F0',
              }}
            />
            <Line
              type="monotone"
              dataKey="time"
              stroke="#00C853"
              strokeWidth={3}
              dot={{ fill: '#00C853', r: 5 }}
              activeDot={{ r: 7 }}
              name="实际响应时间"
            />
            <Line
              type="monotone"
              dataKey="threshold"
              stroke="#FF9800"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="阈值线"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
