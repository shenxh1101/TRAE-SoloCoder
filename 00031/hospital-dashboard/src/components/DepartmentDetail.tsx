import ReactECharts from 'echarts-for-react';
import { ArrowLeft, Users, Clock, Star, Activity } from 'lucide-react';
import type { DepartmentStats, DoctorStats, Doctor, Department } from '../types';

interface DepartmentDetailProps {
  departmentId: string;
  departmentStats: DepartmentStats[];
  doctorStats: DoctorStats[];
  doctors: Doctor[];
  departments: Department[];
  onBack: () => void;
}

export default function DepartmentDetail({
  departmentId,
  departmentStats,
  doctorStats,
  doctors,
  departments,
  onBack,
}: DepartmentDetailProps) {
  const dept = departments.find(d => d.id === departmentId);
  const deptStats = departmentStats.filter(s => s.departmentId === departmentId).slice(0, 7).reverse();
  const deptDoctors = doctors.filter(d => d.departmentId === departmentId);
  const deptDoctorStats = doctorStats.filter(s => s.departmentId === departmentId);

  const latestStat = deptStats[deptStats.length - 1];

  const doctorEfficiencyData = deptDoctors.map(doctor => {
    const stats = deptDoctorStats.filter(s => s.doctorId === doctor.id);
    const avgStats = stats.length > 0 ? {
      totalPatients: Math.round(stats.reduce((acc, s) => acc + s.totalPatients, 0) / stats.length),
      avgDuration: Math.round(stats.reduce((acc, s) => acc + s.averageVisitDuration, 0) / stats.length),
      avgSatisfaction: Math.round((stats.reduce((acc, s) => acc + s.averageSatisfaction, 0) / stats.length) * 10) / 10,
      efficiencyScore: Math.round(stats.reduce((acc, s) => acc + s.efficiencyScore, 0) / stats.length),
    } : { totalPatients: 0, avgDuration: 0, avgSatisfaction: 0, efficiencyScore: 0 };
    
    return {
      ...doctor,
      ...avgStats,
    };
  }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  const satisfactionTrendOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `${params[0].axisValue}<br/>`;
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${p.value}分<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: doctorEfficiencyData.slice(0, 4).map(d => d.name),
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '5%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: deptStats.map(s => s.date.slice(5)),
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 3,
      max: 5,
      axisLabel: { formatter: '{value}分', color: '#6b7280', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    },
    series: doctorEfficiencyData.slice(0, 4).map((doctor, index) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
      return {
        name: doctor.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: colors[index], width: 2 },
        itemStyle: { color: colors[index] },
        data: deptStats.map(s => {
          const stat = deptDoctorStats.find(ds => 
            ds.doctorId === doctor.id && ds.date === s.date
          );
          return stat?.averageSatisfaction || 4.5;
        }),
      };
    }),
  };

  const efficiencyBarOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0];
        const doctor = doctorEfficiencyData.find(d => d.name === data.name);
        return `${data.name}<br/>
                效率评分: <strong>${data.value}</strong><br/>
                日均接诊: ${doctor?.totalPatients}人<br/>
                平均就诊: ${doctor?.avgDuration}分钟<br/>
                满意度: ${doctor?.avgSatisfaction}分`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '5%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}', color: '#6b7280', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: doctorEfficiencyData.map(d => d.name),
      axisLabel: { color: '#374151', fontSize: 12, fontWeight: 500 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: doctorEfficiencyData.map(d => ({
          value: d.efficiencyScore,
          itemStyle: {
            color: d.efficiencyScore >= 85 ? '#10b981' : d.efficiencyScore >= 70 ? '#3b82f6' : '#f59e0b',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 18,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          color: '#374151',
          fontSize: 12,
          fontWeight: 500,
        },
      },
    ],
  };

  const getSaturationColor = (saturation: number) => {
    if (saturation >= 90) return 'text-red-600 bg-red-50';
    if (saturation >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回看板
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{dept?.name}</h2>
            <p className="text-gray-500 mt-1">
              主任: {dept?.director} · 医生 {dept?.totalDoctors} 人 · 日接诊上限 {dept?.dailyCapacity} 人
            </p>
          </div>
          {latestStat && (
            <div className={`px-4 py-2 rounded-lg ${getSaturationColor(latestStat.saturation)}`}>
              <span className="text-sm font-medium">当前饱和度</span>
              <span className="text-2xl font-bold ml-2">{latestStat.saturation}%</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-gray-400 mb-2">
              <Users className="w-5 h-5 mr-2" />
              <span className="text-sm">今日总挂号</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{latestStat?.totalRegistrations || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-gray-400 mb-2">
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-sm">平均候诊时间</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{latestStat?.averageWaitingTime || 0}<span className="text-sm ml-1">分钟</span></p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-gray-400 mb-2">
              <Activity className="w-5 h-5 mr-2" />
              <span className="text-sm">平均就诊时长</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{latestStat?.averageVisitDuration || 0}<span className="text-sm ml-1">分钟</span></p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-gray-400 mb-2">
              <Star className="w-5 h-5 mr-2" />
              <span className="text-sm">平均满意度</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {deptDoctorStats.length > 0 
                ? (deptDoctorStats.reduce((acc, s) => acc + s.averageSatisfaction, 0) / deptDoctorStats.length).toFixed(1)
                : '4.8'}
              <span className="text-sm ml-1">分</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">医生接诊效率对比</h3>
          <ReactECharts option={efficiencyBarOption} style={{ height: '350px' }} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">患者满意度评分趋势</h3>
          <ReactECharts option={satisfactionTrendOption} style={{ height: '350px' }} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">医生详情列表</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">医生姓名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">职称</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">日均接诊</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">平均就诊时长</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">平均满意度</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">效率评分</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">状态</th>
              </tr>
            </thead>
            <tbody>
              {doctorEfficiencyData.map(doctor => (
                <tr key={doctor.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-primary-600 font-semibold">{doctor.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doctor.name}</p>
                        <p className="text-sm text-gray-500">{doctor.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">{doctor.title}</td>
                  <td className="py-4 px-4 text-center font-medium text-gray-900">{doctor.totalPatients}</td>
                  <td className="py-4 px-4 text-center text-gray-600">{doctor.avgDuration}分钟</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="font-medium text-gray-900">{doctor.avgSatisfaction}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      doctor.efficiencyScore >= 85 
                        ? 'bg-green-100 text-green-700' 
                        : doctor.efficiencyScore >= 70 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {doctor.efficiencyScore}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                      正常出诊
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
