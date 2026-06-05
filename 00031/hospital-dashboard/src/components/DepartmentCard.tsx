import { Users, Clock, Activity, ChevronRight } from 'lucide-react';
import type { DepartmentStats, Department } from '../types';

interface DepartmentCardProps {
  stats: DepartmentStats;
  department?: Department;
  onClick: (deptId: string) => void;
}

export default function DepartmentCard({ stats, department, onClick }: DepartmentCardProps) {
  
  const getSaturationColor = (saturation: number) => {
    if (saturation >= 90) return 'text-red-600 bg-red-50';
    if (saturation >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getSaturationBarColor = (saturation: number) => {
    if (saturation >= 90) return 'bg-red-500';
    if (saturation >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getWaitTimeColor = (waitTime: number) => {
    if (waitTime >= 40) return 'text-red-600';
    if (waitTime >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div
      onClick={() => onClick(stats.departmentId)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
            {stats.departmentName}
          </h3>
          <p className="text-sm text-gray-500">
            医生 {department?.totalDoctors || 0} 人 · 日接诊上限 {department?.dailyCapacity || 0}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSaturationColor(stats.saturation)}`}>
          {stats.saturation}%
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">科室饱和度</span>
          <span className="text-gray-700 font-medium">
            {stats.completedVisits}/{department?.dailyCapacity || 0} 人
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getSaturationBarColor(stats.saturation)}`}
            style={{ width: `${Math.min(stats.saturation, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center text-gray-400 mb-1">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-lg font-semibold text-gray-900">{stats.totalRegistrations}</p>
          <p className="text-xs text-gray-500">总挂号</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <p className={`text-lg font-semibold ${getWaitTimeColor(stats.averageWaitingTime)}`}>
            {stats.averageWaitingTime}
          </p>
          <p className="text-xs text-gray-500">平均候诊(分)</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center text-gray-400 mb-1">
            <Activity className="w-4 h-4" />
          </div>
          <p className="text-lg font-semibold text-gray-900">{stats.averageVisitDuration}</p>
          <p className="text-xs text-gray-500">平均就诊(分)</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
        <span className="text-sm text-gray-500">点击查看详细分析</span>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}
