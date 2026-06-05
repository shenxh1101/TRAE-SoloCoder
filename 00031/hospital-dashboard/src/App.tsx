import { useState, useMemo, useEffect } from 'react';
import { Users, Clock, Activity, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import Header from './components/Header';
import TimeRangeSelector from './components/TimeRangeSelector';
import StatCard from './components/StatCard';
import DepartmentCard from './components/DepartmentCard';
import HeatmapChart from './components/HeatmapChart';
import ResourceRanking from './components/ResourceRanking';
import AlertPanel from './components/AlertPanel';
import DepartmentDetail from './components/DepartmentDetail';
import ScheduleUploadModal from './components/ScheduleUploadModal';
import WeeklyReportModal from './components/WeeklyReportModal';
import type { TimeRange, Schedule, DepartmentStats } from './types';
import {
  useDepartmentStats,
  useAlerts,
  useDepartments,
  useDoctors,
  useDoctorStats,
  useSchedules,
  useRegistrations,
  useWeeklyReport,
  useWebSocketConnection,
} from './services/useData';
import { api } from './services/api';
import { websocketService } from './services/websocket';
import { setLookupData } from './utils/excelParser';
import { formatDateTime } from './utils/calculations';

function App() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { isConnected } = useWebSocketConnection();

  const { data: departments, loading: deptLoading } = useDepartments({
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: doctors, loading: doctorsLoading } = useDoctors(undefined, {
    refetchInterval: 5 * 60 * 1000,
  });

  const {
    data: departmentStats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useDepartmentStats(undefined, timeRange, {
    refetchInterval: 60 * 1000,
  });

  const {
    data: alerts,
    loading: alertsLoading,
    refetch: refetchAlerts,
    setData: setAlerts,
  } = useAlerts(undefined, {
    refetchInterval: 30 * 1000,
    enableWebSocket: true,
  });

  const {
    data: doctorStats,
    loading: doctorStatsLoading,
  } = useDoctorStats(undefined, undefined, {
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: schedules, refetch: refetchSchedules } = useSchedules(undefined, {
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: registrationsData } = useRegistrations(
    { pageSize: 1000 },
    { refetchInterval: 2 * 60 * 1000 }
  );

  const {
    data: weeklyReport,
    refetch: refetchWeeklyReport,
  } = useWeeklyReport(undefined, undefined, {
    refetchInterval: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (departments && doctors) {
      setLookupData(departments, doctors);
    }
  }, [departments, doctors]);

  useEffect(() => {
    if (!isConnected) return;

    const cleanupRegistration = websocketService.onRegistrationUpdate(() => {
      refetchStats();
      refetchAlerts();
    });

    const cleanupSchedule = websocketService.on('schedule_update', () => {
      refetchSchedules();
      refetchStats();
    });

    return () => {
      cleanupRegistration();
      cleanupSchedule();
    };
  }, [isConnected, refetchStats, refetchAlerts, refetchSchedules]);

  const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;

  const filteredDeptStats = useMemo(() => {
    if (!departmentStats || !departments) return [];

    return departments
      .map(dept => {
        const deptStats = departmentStats
          .filter(s => s.departmentId === dept.id)
          .slice(0, days);

        if (deptStats.length === 0) return null;

        return {
          ...deptStats[0],
          totalRegistrations: deptStats.reduce((acc, s) => acc + s.totalRegistrations, 0),
          completedVisits: deptStats.reduce((acc, s) => acc + s.completedVisits, 0),
          cancelledVisits: deptStats.reduce((acc, s) => acc + s.cancelledVisits, 0),
          averageWaitingTime: Math.round(
            deptStats.reduce((acc, s) => acc + s.averageWaitingTime, 0) / deptStats.length
          ),
          maxWaitingTime: Math.max(...deptStats.map(s => s.maxWaitingTime)),
          averageVisitDuration: Math.round(
            deptStats.reduce((acc, s) => acc + s.averageVisitDuration, 0) / deptStats.length
          ),
          saturation:
            Math.round(
              (deptStats.reduce((acc, s) => acc + s.saturation, 0) / deptStats.length) * 10
            ) / 10,
          resourceUtilization:
            Math.round(
              (deptStats.reduce((acc, s) => acc + s.resourceUtilization, 0) / deptStats.length) * 10
            ) / 10,
        } as DepartmentStats;
      })
      .filter(Boolean)
      .sort((a, b) => b!.saturation - a!.saturation) as DepartmentStats[];
  }, [timeRange, departmentStats, departments]);

  const totalStats = useMemo(() => {
    if (filteredDeptStats.length === 0) {
      return {
        totalRegistrations: 0,
        avgWaitTime: 0,
        avgSaturation: 0,
        activeAlerts: 0,
        totalDoctors: doctors?.length || 0,
      };
    }

    const totalRegistrations = filteredDeptStats.reduce((acc, s) => acc + s.totalRegistrations, 0);
    const avgWaitTime = Math.round(
      filteredDeptStats.reduce((acc, s) => acc + s.averageWaitingTime, 0) / filteredDeptStats.length
    );
    const avgSaturation =
      Math.round(
        (filteredDeptStats.reduce((acc, s) => acc + s.saturation, 0) / filteredDeptStats.length) * 10
      ) / 10;
    const activeAlerts = alerts?.filter(a => !a.resolved).length || 0;

    return {
      totalRegistrations,
      avgWaitTime,
      avgSaturation,
      activeAlerts,
      totalDoctors: doctors?.length || 0,
    };
  }, [filteredDeptStats, alerts, doctors]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.alert.resolve(alertId);
      setAlerts(prev =>
        prev ? prev.map(a => (a.id === alertId ? { ...a, resolved: true } : a)) : []
      );

      const alert = alerts?.find(a => a.id === alertId);
      if (alert) {
        try {
          await api.message.sendNotification({
            alertId,
            recipients: alert.notifiedTo,
            channels: ['app'],
          });
        } catch (e) {
          console.warn('Failed to send notification:', e);
        }
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleSchedulesImported = async (newSchedules: Schedule[]) => {
    try {
      await api.schedule.create(
        newSchedules.map(s => ({
          doctorId: s.doctorId,
          doctorName: s.doctorName,
          departmentId: s.departmentId,
          departmentName: s.departmentName,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          shiftType: s.shiftType,
          expectedPatients: s.expectedPatients,
        }))
      );

      refetchSchedules();
      refetchStats();

      try {
        await api.alert.getAll({ resolved: false });
        refetchAlerts();
      } catch (e) {
        console.warn('Failed to refresh alerts:', e);
      }
    } catch (error) {
      console.error('Failed to import schedules:', error);
    }
  };

  const handleRefreshAll = () => {
    refetchStats();
    refetchAlerts();
    refetchSchedules();
    refetchWeeklyReport();
  };

  const isLoading = deptLoading || statsLoading || alertsLoading || doctorsLoading || doctorStatsLoading;

  if (selectedDepartment && departments && doctors && doctorStats && departmentStats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          alerts={alerts || []}
          currentView={currentView}
          onViewChange={setCurrentView}
          onShowUpload={() => setShowUploadModal(true)}
          onShowReport={() => setShowReportModal(true)}
        />
        <main className="max-w-[1920px] mx-auto px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">加载数据中...</p>
              </div>
            </div>
          ) : (
            <DepartmentDetail
              departmentId={selectedDepartment}
              departmentStats={departmentStats}
              doctorStats={doctorStats}
              doctors={doctors}
              departments={departments}
              onBack={() => setSelectedDepartment(null)}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        alerts={alerts || []}
        currentView={currentView}
        onViewChange={setCurrentView}
        onShowUpload={() => setShowUploadModal(true)}
        onShowReport={() => setShowReportModal(true)}
      />

      <main className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentView === 'dashboard' ? '总览看板' : currentView === 'departments' ? '科室分析' : '医生效率'}
              </h2>
              <p className="text-gray-500 mt-1">实时监控医院门诊运营情况</p>
            </div>
            <div
              className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 mr-1.5" />
                  实时连接
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 mr-1.5" />
                  离线模式
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefreshAll}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新数据
            </button>
            <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-lg">正在加载数据...</p>
              <p className="text-gray-400 text-sm mt-1">如首次加载较慢，请稍候</p>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    title="总挂号量"
                    value={totalStats.totalRegistrations.toLocaleString()}
                    unit="人次"
                    icon={<Users className="w-6 h-6" />}
                    trend={{ value: 8.5, isPositive: true }}
                    color="blue"
                  />
                  <StatCard
                    title="平均候诊时间"
                    value={totalStats.avgWaitTime}
                    unit="分钟"
                    icon={<Clock className="w-6 h-6" />}
                    trend={{ value: 3.2, isPositive: false }}
                    color="yellow"
                  />
                  <StatCard
                    title="平均科室饱和度"
                    value={totalStats.avgSaturation}
                    unit="%"
                    icon={<Activity className="w-6 h-6" />}
                    trend={{ value: 5.8, isPositive: true }}
                    color="green"
                  />
                  <StatCard
                    title="待处理预警"
                    value={totalStats.activeAlerts}
                    unit="条"
                    icon={<AlertTriangle className="w-6 h-6" />}
                    trend={{ value: 0, isPositive: false }}
                    color="red"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="lg:col-span-2">
                    {departmentStats && (
                      <HeatmapChart stats={departmentStats} timeRange={timeRange} departments={departments || undefined} />
                    )}
                  </div>
                  <div>
                    <AlertPanel alerts={alerts || []} onResolve={handleResolveAlert} />
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">科室运营状态</h3>
                    <span className="text-sm text-gray-500">
                      最后更新: {formatDateTime(new Date().toISOString())}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDeptStats.map(deptStat => (
                      <DepartmentCard
                        key={deptStat.departmentId}
                        stats={deptStat}
                        department={departments?.find(d => d.id === deptStat.departmentId)}
                        onClick={setSelectedDepartment}
                      />
                    ))}
                  </div>
                </div>

                <div>{departmentStats && <ResourceRanking stats={departmentStats} timeRange={timeRange} />}</div>
              </>
            )}

            {currentView === 'departments' && departments && departmentStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {filteredDeptStats.map(deptStat => (
                    <DepartmentCard
                      key={deptStat.departmentId}
                      stats={deptStat}
                      department={departments?.find(d => d.id === deptStat.departmentId)}
                      onClick={setSelectedDepartment}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <HeatmapChart stats={departmentStats} timeRange={timeRange} departments={departments} />
                  <ResourceRanking stats={departmentStats} timeRange={timeRange} />
                </div>
              </>
            )}

            {currentView === 'doctors' && departments && doctors && doctorStats && (
              <div className="space-y-6">
                {departments.map(dept => {
                  const deptDoctors = doctors.filter(d => d.departmentId === dept.id);
                  const deptDoctorStats = doctorStats.filter(s => s.departmentId === dept.id);

                  if (deptDoctors.length === 0) return null;

                  return (
                    <div
                      key={dept.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{dept.name}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                医生姓名
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                职称
                              </th>
                              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                                日均接诊
                              </th>
                              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                                平均就诊时长
                              </th>
                              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                                平均满意度
                              </th>
                              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                                效率评分
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {deptDoctors.map(doctor => {
                              const stats = deptDoctorStats.filter(s => s.doctorId === doctor.id);
                              const avgStats =
                                stats.length > 0
                                  ? {
                                      totalPatients: Math.round(
                                        stats.reduce((acc, s) => acc + s.totalPatients, 0) / stats.length
                                      ),
                                      avgDuration: Math.round(
                                        stats.reduce((acc, s) => acc + s.averageVisitDuration, 0) / stats.length
                                      ),
                                      avgSatisfaction:
                                        Math.round(
                                          (stats.reduce((acc, s) => acc + s.averageSatisfaction, 0) /
                                            stats.length) *
                                            10
                                        ) / 10,
                                      efficiencyScore: Math.round(
                                        stats.reduce((acc, s) => acc + s.efficiencyScore, 0) / stats.length
                                      ),
                                    }
                                  : { totalPatients: 0, avgDuration: 0, avgSatisfaction: 0, efficiencyScore: 0 };

                              return (
                                <tr
                                  key={doctor.id}
                                  className="border-b border-gray-50 hover:bg-gray-50"
                                >
                                  <td className="py-4 px-4">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-primary-600 font-semibold">
                                          {doctor.name.charAt(0)}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900">{doctor.name}</p>
                                        <p className="text-sm text-gray-500">{doctor.phone}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-sm text-gray-600">{doctor.title}</td>
                                  <td className="py-4 px-4 text-center font-medium text-gray-900">
                                    {avgStats.totalPatients}
                                  </td>
                                  <td className="py-4 px-4 text-center text-gray-600">
                                    {avgStats.avgDuration}分钟
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <div className="flex items-center justify-center">
                                      <span className="text-yellow-400 mr-1">★</span>
                                      <span className="font-medium text-gray-900">
                                        {avgStats.avgSatisfaction}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <span
                                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        avgStats.efficiencyScore >= 85
                                          ? 'bg-green-100 text-green-700'
                                          : avgStats.efficiencyScore >= 70
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                      }`}
                                    >
                                      {avgStats.efficiencyScore}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <ScheduleUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        schedules={schedules || []}
        registrations={registrationsData?.data || []}
        onSchedulesImported={handleSchedulesImported}
      />

      {weeklyReport && (
        <WeeklyReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          report={weeklyReport}
          onRefresh={refetchWeeklyReport}
        />
      )}
    </div>
  );
}

export default App;
