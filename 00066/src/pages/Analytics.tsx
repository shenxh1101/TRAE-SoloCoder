import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Loader2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { get } from '../services/api';

interface MonthlyData {
  month: string;
  completed: number;
  total: number;
  alerts: number;
}

interface AnomalyData {
  name: string;
  value: number;
  color: string;
}

interface RadarDataItem {
  subject: string;
  A: number;
  B: number;
  fullMark: number;
}

interface DashboardAnalytics {
  completionRate: number;
  avgResponseTime: number;
  complianceRate: number;
  anomalyRate: number;
}

export default function Analytics() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyData[]>([]);
  const [radarData, setRadarData] = useState<RadarDataItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [monthlyRes, anomalyRes, radarRes, dashboardRes] = await Promise.all([
        get<MonthlyData[]>('/analytics/monthly-completion'),
        get<AnomalyData[]>('/analytics/anomaly-distribution'),
        get<RadarDataItem[]>('/analytics/radar-metrics'),
        get<DashboardAnalytics>('/analytics/dashboard'),
      ]);

      setMonthlyData(monthlyRes.data);
      setAnomalyData(anomalyRes.data);
      setRadarData(radarRes.data);
      setDashboardStats(dashboardRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">加载分析数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-acoustic-danger mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={loadAnalyticsData} className="mt-4 btn-primary">重试</button>
      </div>
    );
  }

  const stats = dashboardStats || {
    completionRate: 0,
    avgResponseTime: 0,
    complianceRate: 0,
    anomalyRate: 0,
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">数据分析</h1>
          <p className="text-gray-400 text-sm">性能统计看板 · 模拟效率追踪 · 质量指标分析</p>
        </div>

        <div className="flex items-center space-x-2">
          <select className="px-4 py-2 bg-acoustic-midnight/50 border border-acoustic-steel/40 rounded text-sm 
                          text-white focus:outline-none focus:border-acoustic-cyber">
            <option>最近6个月</option>
            <option>本年度</option>
            <option>自定义范围</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 card-hover-effect">
          <TrendingUp className="w-8 h-8 text-acoustic-success mb-3" />
          <p className="text-2xl font-bold data-value text-acoustic-success">{stats.completionRate}%</p>
          <p className="text-sm text-gray-400">平均完成率</p>
          <p className="text-xs text-acoustic-success mt-1">↑ 2.3% vs 上月</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <Activity className="w-8 h-8 text-acoustic-cyber mb-3" />
          <p className="text-2xl font-bold data-value text-acoustic-cyber">{stats.avgResponseTime.toFixed(1)}分钟</p>
          <p className="text-sm text-gray-400">平均响应时间</p>
          <p className="text-xs text-acoustic-cyber mt-1">↓ 18秒 vs 上月</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <BarChart3 className="w-8 h-8 text-acoustic-neon mb-3" />
          <p className="text-2xl font-bold data-value text-acoustic-neon">{stats.complianceRate}%</p>
          <p className="text-sm text-gray-400">声场达标率</p>
          <p className="text-xs text-acoustic-neon mt-1">↑ 1.5% vs 上月</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <PieChart className="w-8 h-8 text-acoustic-warning mb-3" />
          <p className="text-2xl font-bold data-value text-acoustic-warning">{stats.anomalyRate}%</p>
          <p className="text-sm text-gray-400">异常任务比例</p>
          <p className="text-xs text-acoustic-success mt-1">↓ 0.8% vs 上月</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-acoustic-cyber" />
            月度任务统计
          </h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
              <XAxis dataKey="month" stroke="#718096" fontSize={12} />
              <YAxis stroke="#718096" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D1B2A',
                  border: '1px solid #2D3748',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                }}
              />
              <Legend />
              <Bar dataKey="completed" fill="#00C853" name="已完成" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" fill="#00D4FF" name="总任务" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-acoustic-warning" />
            异常类型分布
          </h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={anomalyData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {anomalyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D1B2A',
                  border: '1px solid #2D3748',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                }}
              />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-acoustic-data" />
            预警趋势分析
          </h3>
          
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
              <XAxis dataKey="month" stroke="#718096" fontSize={12} />
              <YAxis stroke="#718096" fontSize={12} />
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
                dataKey="alerts"
                stroke="#FF9800"
                strokeWidth={3}
                dot={{ fill: '#FF9800', r: 5 }}
                activeDot={{ r: 7 }}
                name="预警数量"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-acoustic-neon" />
            综合质量雷达图
          </h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#2D3748" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#718096', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#718096', fontSize: 10 }} />
              <Radar
                name="当前表现"
                dataKey="A"
                stroke="#00D4FF"
                fill="#00D4FF"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="目标值"
                dataKey="B"
                stroke="#00C853"
                fill="#00C853"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D1B2A',
                  border: '1px solid #2D3748',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">每日自动报告摘要</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-acoustic-midnight/30 rounded-lg">
            <h4 className="font-semibold text-acoustic-cyber mb-2">今日概况</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• 新增模拟任务: 12 个</li>
              <li>• 完成计算: 8 个</li>
              <li>• 平均耗时: 42 分钟</li>
              <li>• 系统可用性: 99.8%</li>
            </ul>
          </div>

          <div className="p-4 bg-acoustic-midnight/30 rounded-lg">
            <h4 className="font-semibold text-acoustic-warning mb-2">预警响应</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• 新发预警: 3 条 (1红/1橙/1黄)</li>
              <li>• 已处理: 2 条</li>
              <li>• 平均响应: 12 分钟</li>
              <li>• 待处理: 1 条 (&lt;1小时)</li>
            </ul>
          </div>

          <div className="p-4 bg-acoustic-midnight/30 rounded-lg">
            <h4 className="font-semibold text-acoustic-success mb-2">质量指标</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• 声场达标率: 94.1%</li>
              <li>• 审批通过率: 96%</li>
              <li>• 用户满意度: 4.8/5</li>
              <li>• 异常率: 3.2%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
