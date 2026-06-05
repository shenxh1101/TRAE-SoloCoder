import React, { useState } from 'react';
import {
  FileCheck, Droplets, Truck, Bell, FileSpreadsheet,
  User, Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowRight, QrCode, Download, MapPin, Package, TrendingUp
} from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useBloodBankStore } from '@/store';
import type { TransfusionRequest, TransportTask, InventoryAlert, SystemAlert } from '@/types';
import {
  BLOOD_TYPE_LABELS, COMPONENT_LABELS, STATUS_LABELS,
  URGENCY_LABELS, URGENCY_COLORS, BLOOD_TYPE_COLORS, APPROVAL_LABELS
} from '@/types';
import { formatDate, formatDateTime, getDaysDifference } from '@/utils/dateUtils';
import * as reportService from '@/services/reportService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const RightPanel: React.FC = () => {
  const {
    transfusionRequests, transportTasks, inventoryAlerts, systemAlerts,
    bloodBags, patients, crossMatchResults,
    approveRequest, rejectRequest, performCrossMatch,
    confirmNurseReceive, acknowledgeAlert, performCrossMatchForRequest,
    createTransportTask
  } = useBloodBankStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const bloodTypes: ('A' | 'B' | 'AB' | 'O')[] = ['A', 'B', 'AB', 'O'];

  const getApprovalStep = (request: TransfusionRequest) => {
    switch (request.status) {
      case 'doctor_approved': return 0;
      case 'director_approved': return 1;
      case 'approved': return 2;
      case 'rejected': return -1;
      case 'cross_matched': return 2;
      case 'transporting': return 3;
      case 'delivered': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  const handleApprove = (request: TransfusionRequest) => {
    approveRequest(request.id);
    setShowSuccess(`申请 ${request.id} 审批通过`);
    setTimeout(() => setShowSuccess(null), 2000);
  };

  const handleReject = (request: TransfusionRequest, reason: string) => {
    rejectRequest(request.id, reason);
    setShowSuccess(`申请 ${request.id} 已拒绝`);
    setTimeout(() => setShowSuccess(null), 2000);
  };

  const handleCrossMatch = (request: TransfusionRequest) => {
    performCrossMatchForRequest(request.id);
    setShowSuccess(`交叉配血完成: ${request.patientId}`);
    setTimeout(() => setShowSuccess(null), 2000);
  };

  const handleCreateTransport = (request: TransfusionRequest) => {
    createTransportTask(request.id);
    setShowSuccess('运输任务已创建');
    setTimeout(() => setShowSuccess(null), 2000);
  };

  const handleConfirmReceive = (task: TransportTask) => {
    confirmNurseReceive(task.id, `nurse_${Date.now()}`);
    setShowSuccess(`任务 ${task.id} 已签收`);
    setTimeout(() => setShowSuccess(null), 2000);
  };

  const handleExportDaily = async () => {
    try {
      const blob = await reportService.exportDailyReport();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `日报_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowSuccess('日报已导出');
      setTimeout(() => setShowSuccess(null), 2000);
    } catch (error) {
      console.error('导出日报失败:', error);
    }
  };

  const matchRate = crossMatchResults.length > 0
    ? (crossMatchResults.filter(r => r.matchResult === 'compatible').length / crossMatchResults.length * 100)
    : 100;

  const bloodTypeDistribution = bloodTypes.map(bt => ({
    name: `${bt}型`,
    value: bloodBags.filter(b => b.bloodType === bt && b.status === 'available').length
  }));

  const getSeverityType = (severity: string): 'low' | 'medium' | 'high' | 'critical' => {
    if (severity === 'critical') return 'critical';
    if (severity === 'high') return 'high';
    if (severity === 'medium') return 'medium';
    return 'low';
  };

  const getAlertDate = (alert: InventoryAlert | SystemAlert): string => {
    if ('timestamp' in alert) {
      return alert.timestamp;
    }
    return alert.createdAt;
  };

  const getAlertTitle = (alert: InventoryAlert | SystemAlert): string => {
    if ('title' in alert) {
      return alert.title;
    }
    return `库存预警: ${alert.bloodType}型${COMPONENT_LABELS[alert.component]}`;
  };

  const approvalTab = {
    id: 'approval',
    label: '审批管理',
    icon: <FileCheck size={14} />,
    content: (
      <div className="space-y-3">
        {transfusionRequests.filter(r => r.status !== 'completed').length === 0 ? (
          <Alert type="info" message="暂无待审批申请" />
        ) : (
          transfusionRequests
            .filter(r => r.status !== 'completed')
            .map(request => {
              const patient = patients.find(p => p.id === request.patientId);
              const step = getApprovalStep(request);
              const matchResult = crossMatchResults.find(m => m.requestId === request.id);
              
              return (
                <div key={request.id} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <User size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{patient?.name || request.patientId}</p>
                        <p className="text-xs text-slate-400">
                          {BLOOD_TYPE_LABELS[patient?.bloodType || request.bloodType]}型
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={request.urgency === 'emergency' ? 'danger' : request.urgency === 'urgent' ? 'warning' : 'info'} 
                      pulse={request.urgency === 'emergency'}
                    >
                      {URGENCY_LABELS[request.urgency]}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                    <Droplets size={12} style={{ color: BLOOD_TYPE_COLORS[request.bloodType] }} />
                    <span>{BLOOD_TYPE_LABELS[request.bloodType]}型 {COMPONENT_LABELS[request.component]}</span>
                    <span className="text-slate-500">·</span>
                    <span>{request.volume}ml</span>
                    <span className="text-slate-500">·</span>
                    <span>{request.department}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-3">
                    {['科室主任', '血库主任', '配血完成', '运输中', '完成'].map((label, i) => (
                      <React.Fragment key={i}>
                        <div className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-xs',
                          i < step ? 'bg-green-500/20 text-green-400' :
                          i === step ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-700/50 text-slate-500'
                        )}>
                          {i < step ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {label}
                        </div>
                        {i < 4 && <ArrowRight size={12} className="text-slate-600" />}
                      </React.Fragment>
                    ))}
                  </div>
                  
                  {matchResult && (
                    <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle size={14} className="text-green-400" />
                        <span className="text-green-400 font-medium">配血成功</span>
                        <span className="text-slate-400">
                          {BLOOD_TYPE_LABELS[request.bloodType]}型
                          {COMPONENT_LABELS[request.component]}
                          × 1袋
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">{request.id}</span>
                    <div className="flex gap-2">
                      {step >= 0 && step < 2 && request.status !== 'rejected' && (
                        <>
                          <Button size="sm" variant="danger" onClick={() => handleReject(request, '拒绝')}>
                            <XCircle size={12} /> 拒绝
                          </Button>
                          <Button size="sm" variant="primary" onClick={() => handleApprove(request)}>
                            <CheckCircle size={12} /> 通过
                          </Button>
                        </>
                      )}
                      {step === 2 && !matchResult && request.status === 'approved' && (
                        <Button size="sm" variant="success" onClick={() => handleCrossMatch(request)}>
                          <Droplets size={12} /> 交叉配血
                        </Button>
                      )}
                      {matchResult && !transportTasks.find(t => t.requestId === request.id) && request.status === 'cross_matched' && (
                        <Button size="sm" variant="primary" onClick={() => handleCreateTransport(request)}>
                          <Truck size={12} /> 创建运输
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    )
  };

  const crossMatchTab = {
    id: 'crossmatch',
    label: '配血记录',
    icon: <Droplets size={14} />,
    content: (
      <div className="space-y-3">
        {crossMatchResults.length === 0 ? (
          <Alert type="info" message="暂无配血记录" />
        ) : (
          crossMatchResults.map(result => {
            const request = transfusionRequests.find(r => r.id === result.requestId);
            const patient = patients.find(p => p.id === request?.patientId);
            const matchedBag = bloodBags.find(b => b.id === result.bloodBagId);
            
            return (
              <div key={result.id} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      result.matchResult === 'compatible' ? 'bg-green-500/20' : 'bg-red-500/20'
                    )}>
                      {result.matchResult === 'compatible' ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{patient?.name || '未知'}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(result.performedAt)}</p>
                    </div>
                  </div>
                  <Badge variant={result.matchResult === 'compatible' ? 'success' : 'danger'}>
                    {result.matchResult === 'compatible' ? '配血成功' : '配血失败'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                  <div className="p-2 bg-slate-700/50 rounded-lg">
                    <p className="text-slate-400">患者血型</p>
                    <p className="font-bold font-mono" style={{ color: BLOOD_TYPE_COLORS[request?.bloodType || 'O'] }}>
                      {BLOOD_TYPE_LABELS[request?.bloodType || 'O']}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded-lg">
                    <p className="text-slate-400">配血成分</p>
                    <p className="font-bold text-slate-200">{COMPONENT_LABELS[request?.component || 'whole_blood']}</p>
                  </div>
                </div>
                
                {result.matchResult === 'compatible' && matchedBag && (
                  <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-400 mb-1">匹配血袋</p>
                    <div className="flex flex-wrap gap-1">
                      <span
                        className="px-2 py-0.5 text-xs rounded-full font-mono"
                        style={{ 
                          backgroundColor: `${BLOOD_TYPE_COLORS[matchedBag.bloodType]}20`,
                          color: BLOOD_TYPE_COLORS[matchedBag.bloodType]
                        }}
                      >
                        {BLOOD_TYPE_LABELS[matchedBag.bloodType]} {matchedBag.volume}ml
                      </span>
                    </div>
                  </div>
                )}
                
                {result.matchResult !== 'compatible' && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-xs text-red-400">配血不相容，相容性分数: {result.compatibilityScore}%</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    )
  };

  const transportTab = {
    id: 'transport',
    label: '运输监控',
    icon: <Truck size={14} />,
    content: (
      <div className="space-y-3">
        {transportTasks.length === 0 ? (
          <Alert type="info" message="暂无运输任务" />
        ) : (
          transportTasks.map(task => {
            const request = transfusionRequests.find(r => r.id === task.requestId);
            const patient = patients.find(p => p.id === request?.patientId);
            const isOvertime = getDaysDifference(new Date(), task.estimatedArrival) < 0 && task.status === 'in_progress';
            
            return (
              <div key={task.id} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-blue-400" />
                      <span className="text-sm font-medium text-slate-200">{task.destinationWard}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">患者: {patient?.name || '未知'}</p>
                  </div>
                  <Badge variant={
                    task.status === 'delivered' ? 'success' :
                    task.status === 'in_progress' ? (isOvertime ? 'danger' : 'warning') :
                    'info'
                  } pulse={task.status === 'in_progress'}>
                    {task.status === 'pending' ? '待出发' :
                     task.status === 'in_progress' ? '运输中' :
                     task.status === 'delivered' ? '已送达' :
                     '已取消'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                  <Package size={12} />
                  <span>{task.bloodBagIds?.length || 1} 袋血液</span>
                  <span className="text-slate-500">·</span>
                  <span>机器人 #{task.robotId.slice(-3)}</span>
                </div>
                
                <div className="relative h-1.5 bg-slate-700 rounded-full mb-2 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${task.progress * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>进度: {(task.progress * 100).toFixed(0)}%</span>
                  <span>预计到达: {formatDateTime(task.estimatedArrival)}</span>
                </div>
                
                {isOvertime && task.status === 'in_progress' && (
                  <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-400 animate-pulse" />
                      <p className="text-xs text-red-400">运输超时，已自动催办护士</p>
                    </div>
                  </div>
                )}
                
                {task.status === 'delivered' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" className="flex-1" onClick={() => handleConfirmReceive(task)}>
                      <QrCode size={12} /> 扫码确认
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    )
  };

  const alertTab = {
    id: 'alerts',
    label: '预警中心',
    icon: <Bell size={14} />,
    content: (
      <div className="space-y-3">
        {[...inventoryAlerts, ...systemAlerts]
          .sort((a, b) => new Date(getAlertDate(b)).getTime() - new Date(getAlertDate(a)).getTime())
          .slice(0, 10)
          .map(alert => {
            const isInventory = 'bloodType' in alert;
            const severity = getSeverityType(alert.severity);
            
            return (
              <div
                key={alert.id}
                className={cn(
                  'p-3 rounded-xl border transition-all',
                  severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                  severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                  severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-blue-500/10 border-blue-500/30',
                  alert.acknowledged ? 'opacity-60' : ''
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className={cn(
                      severity === 'critical' ? 'text-red-400' :
                      severity === 'high' ? 'text-orange-400' :
                      severity === 'medium' ? 'text-yellow-400' :
                      'text-blue-400',
                      !alert.acknowledged && 'animate-pulse'
                    )} />
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        severity === 'critical' ? 'text-red-400' :
                        severity === 'high' ? 'text-orange-400' :
                        severity === 'medium' ? 'text-yellow-400' :
                        'text-blue-400'
                      )}>
                        {getAlertTitle(alert)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(getAlertDate(alert))}</p>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      确认
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-slate-300">{alert.message}</p>
                
                {isInventory && (
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: BLOOD_TYPE_COLORS[alert.bloodType] }}
                    >
                      {alert.bloodType}
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-300">
                        {BLOOD_TYPE_LABELS[alert.bloodType]}型 {COMPONENT_LABELS[alert.component]}
                      </p>
                      <p className="text-slate-400">
                        当前库存: {alert.currentStock}袋 / 阈值: {alert.threshold}袋
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        
        {[...inventoryAlerts, ...systemAlerts].length === 0 && (
          <Alert type="success" message="当前无任何预警" />
        )}
      </div>
    )
  };

  const reportTab = {
    id: 'report',
    label: '数据报表',
    icon: <FileSpreadsheet size={14} />,
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">日报导出</p>
            <p className="text-xs text-slate-400">导出各血型库存、出入库记录和配血符合率</p>
          </div>
          <Button variant="primary" onClick={handleExportDaily}>
            <Download size={14} /> 导出日报
          </Button>
        </div>
        
        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-sm font-medium text-slate-200 mb-3">配血符合率趋势</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bloodTypes.map(bt => ({
                name: `${bt}型`,
                rate: (() => {
                  const btRequests = transfusionRequests.filter(r => r.bloodType === bt && r.crossMatchResult);
                  if (btRequests.length === 0) return 100;
                  return (btRequests.filter(r => r.crossMatchResult!.matchResult === 'compatible').length / btRequests.length * 100);
                })()
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[95, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#00B42A"
                  strokeWidth={2}
                  dot={{ fill: '#00B42A', r: 3 }}
                  name="配血符合率"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-sm font-medium text-slate-200 mb-3">血型分布</p>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bloodTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill="#165DFF" />
                  <Cell fill="#722ED1" />
                  <Cell fill="#00B42A" />
                  <Cell fill="#F53F3F" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center">
            <p className="text-2xl font-bold text-green-400">{matchRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-400">配血符合率</p>
          </div>
          <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center">
            <p className="text-2xl font-bold text-blue-400">{bloodBags.length}</p>
            <p className="text-xs text-slate-400">总库存</p>
          </div>
          <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center">
            <p className="text-2xl font-bold text-purple-400">{crossMatchResults.length}</p>
            <p className="text-xs text-slate-400">配血次数</p>
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="w-96 p-4 overflow-y-auto h-[calc(100vh-4rem)] scrollbar-thin">
      {showSuccess && (
        <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle size={16} className="text-green-400" />
          <span className="text-sm text-green-400">{showSuccess}</span>
        </div>
      )}
      
      <Tabs
        tabs={[approvalTab, crossMatchTab, transportTab, alertTab, reportTab]}
        defaultTab="approval"
      />
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
