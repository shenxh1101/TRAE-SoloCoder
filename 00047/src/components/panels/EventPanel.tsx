import { useState } from 'react';
import { AlertTriangle, Car, AlertCircle, Clock, User, Send, CheckCircle, Video, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrafficEvent, EventType, EventSeverity, EventStatus, WorkOrderStatus } from '@/types';
import { mockEvents, mockUsers, mockCameras } from '@/data/mockData';
import CameraFeedOverlay from './CameraFeedOverlay';

interface EventPanelProps {
  onSelectEvent?: (event: TrafficEvent) => void;
  onDispatchWorkOrder?: (eventId: string, assignee: string) => void;
}

const eventTypeIcons: Record<EventType, typeof AlertTriangle> = {
  congestion: AlertTriangle,
  accident: Car,
  abnormal_parking: AlertCircle,
};

const eventTypeNames: Record<EventType, string> = {
  congestion: '交通拥堵',
  accident: '交通事故',
  abnormal_parking: '异常停车',
};

const eventTypeColors: Record<EventType, string> = {
  congestion: 'text-yellow-400',
  accident: 'text-red-400',
  abnormal_parking: 'text-orange-400',
};

const eventTypeBgs: Record<EventType, string> = {
  congestion: 'bg-yellow-500/10 border-yellow-500/30',
  accident: 'bg-red-500/10 border-red-500/30',
  abnormal_parking: 'bg-orange-500/10 border-orange-500/30',
};

const severityNames: Record<EventSeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const severityColors: Record<EventSeverity, string> = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusNames: Record<EventStatus, string> = {
  detected: '已检测',
  dispatched: '已派单',
  processing: '处理中',
  resolved: '已解决',
};

const statusColors: Record<EventStatus, string> = {
  detected: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  dispatched: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const workOrderStatusNames: Record<WorkOrderStatus, string> = {
  pending: '待接受',
  accepted: '已接受',
  completed: '已完成',
};

export default function EventPanel({
  onSelectEvent,
  onDispatchWorkOrder,
}: EventPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState<TrafficEvent | null>(null);
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<{ id: string; name: string; location: [number, number, number] } | null>(null);

  const filteredEvents = filterStatus === 'all'
    ? mockEvents
    : mockEvents.filter((e) => e.status === filterStatus);

  const handleEventClick = (event: TrafficEvent) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
    onSelectEvent?.(event);
  };

  const handleDispatch = () => {
    if (selectedEvent && selectedAssignee) {
      onDispatchWorkOrder?.(selectedEvent.id, selectedAssignee);
      setShowDetailModal(false);
      setSelectedEvent(null);
      setSelectedAssignee('');
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getCamera = (cameraId?: string) => {
    return mockCameras.find((c) => c.id === cameraId);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-bold text-cyan-300 font-display tracking-wide">事件处置中心</h3>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(['all', 'detected', 'dispatched', 'processing', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              "py-1.5 text-xs rounded border transition-all duration-300",
              filterStatus === status
                ? status === 'all'
                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                  : statusColors[status]
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-500/70 hover:bg-cyan-500/20"
            )}
          >
            {status === 'all' ? '全部' : statusNames[status]}
            <span className="ml-1 font-mono">
              ({status === 'all' ? mockEvents.length : mockEvents.filter((e) => e.status === status).length})
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const Icon = eventTypeIcons[event.type];
            return (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={cn(
                  "p-4 rounded border cursor-pointer transition-all duration-300",
                  "hover:shadow-cyber",
                  eventTypeBgs[event.type]
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded", eventTypeBgs[event.type])}>
                      <Icon className={cn("w-5 h-5", eventTypeColors[event.type])} />
                    </div>
                    <div>
                      <div className={cn("text-sm font-medium", eventTypeColors[event.type])}>
                        {eventTypeNames[event.type]}
                      </div>
                      <div className="text-xs text-cyan-500/70 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(event.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded border",
                      severityColors[event.severity]
                    )}>
                      {severityNames[event.severity]}级
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded border",
                      statusColors[event.status]
                    )}>
                      {statusNames[event.status]}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-cyan-200 mb-2 leading-relaxed">
                  {event.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-cyber-border">
                  <div className="flex items-center gap-1 text-xs text-cyan-500/70">
                    <MapPin className="w-3 h-3" />
                    {event.roadId}
                  </div>

                  {event.workOrder && (
                    <div className="flex items-center gap-2 text-xs">
                      <User className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-400">{event.workOrder.assignee}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px]",
                        event.workOrder.status === 'completed'
                          ? "bg-green-500/20 text-green-400"
                          : event.workOrder.status === 'accepted'
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {workOrderStatusNames[event.workOrder.status]}
                      </span>
                    </div>
                  )}

                  {event.cameraFeed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const camera = getCamera(event.cameraFeed);
                        if (camera) {
                          setSelectedCamera({
                            id: camera.id,
                            name: camera.name,
                            location: camera.position as [number, number, number],
                          });
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                    >
                      <Video className="w-3 h-3" />
                      查看摄像头
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-cyan-500/50">
            <CheckCircle className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm">暂无{filterStatus === 'all' ? '' : statusNames[filterStatus]}事件</p>
          </div>
        )}
      </div>

      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-cyber-panel border border-cyber-border rounded-lg shadow-cyber overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-cyber-border">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = eventTypeIcons[selectedEvent.type];
                  return <Icon className={cn("w-5 h-5", eventTypeColors[selectedEvent.type])} />;
                })()}
                <h4 className="text-lg font-bold text-cyan-300">
                  {eventTypeNames[selectedEvent.type]} - 事件详情
                </h4>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
              {selectedEvent.cameraFeed && (
                <div className="p-4 rounded border border-cyber-border bg-black">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-cyan-400">
                      <Video className="w-4 h-4 animate-pulse" />
                      <span>{getCamera(selectedEvent.cameraFeed)?.name || '实时监控画面'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-red-400">LIVE</span>
                    </div>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(56,139,253,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56,139,253,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="relative z-10 text-center">
                      <Video className="w-12 h-12 text-cyan-500/30 mx-auto mb-2" />
                      <p className="text-cyan-500/50 text-sm">监控画面模拟</p>
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs text-green-400 font-mono">
                      {new Date().toLocaleString('zh-CN')}
                    </div>
                    <div className="absolute bottom-2 right-2 text-xs text-cyan-400 font-mono">
                      CAM:{selectedEvent.cameraFeed}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="text-xs text-cyan-500/70 mb-1">事件类型</div>
                  <div className={cn("text-sm font-medium", eventTypeColors[selectedEvent.type])}>
                    {eventTypeNames[selectedEvent.type]}
                  </div>
                </div>
                <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="text-xs text-cyan-500/70 mb-1">严重程度</div>
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded border inline-block",
                    severityColors[selectedEvent.severity]
                  )}>
                    {severityNames[selectedEvent.severity]}级
                  </span>
                </div>
                <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="text-xs text-cyan-500/70 mb-1">当前状态</div>
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded border inline-block",
                    statusColors[selectedEvent.status]
                  )}>
                    {statusNames[selectedEvent.status]}
                  </span>
                </div>
                <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="text-xs text-cyan-500/70 mb-1">发生时间</div>
                  <div className="text-sm text-cyan-300 font-mono">
                    {selectedEvent.createdAt.toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                <div className="text-xs text-cyan-500/70 mb-1">事件描述</div>
                <div className="text-sm text-cyan-200">{selectedEvent.description}</div>
              </div>

              <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                <div className="text-xs text-cyan-500/70 mb-2">工单派发跟踪</div>
                {selectedEvent.workOrder ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cyan-400">工单编号</span>
                      <span className="text-cyan-200 font-mono">{selectedEvent.workOrder.id}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cyan-400">处理人员</span>
                      <span className="text-cyan-200">{selectedEvent.workOrder.assignee}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cyan-400">当前状态</span>
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded border",
                        selectedEvent.workOrder.status === 'completed'
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : selectedEvent.workOrder.status === 'accepted'
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      )}>
                        {workOrderStatusNames[selectedEvent.workOrder.status]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cyan-400">派发时间</span>
                      <span className="text-cyan-200 font-mono text-xs">
                        {selectedEvent.workOrder.createdAt.toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {selectedEvent.workOrder.notes && (
                      <div className="pt-2 border-t border-cyber-border mt-2">
                        <div className="text-xs text-cyan-500/70 mb-1">处理备注</div>
                        <div className="text-sm text-cyan-200">{selectedEvent.workOrder.notes}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-cyan-500/70">此事件尚未派发工单，请选择处理人员：</p>
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-cyber-bg border border-cyber-border text-cyan-200 text-sm focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="">请选择处理人员</option>
                      {mockUsers.filter((u) => u.role === 'traffic_police').map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.department}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleDispatch}
                      disabled={!selectedAssignee}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-2 rounded",
                        "border transition-all duration-300",
                        selectedAssignee
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30"
                          : "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 cursor-not-allowed"
                      )}
                    >
                      <Send className="w-4 h-4" />
                      派发工单
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCamera && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <button
            onClick={() => setSelectedCamera(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <CameraFeedOverlay
            cameraId={selectedCamera.id}
            cameraName={selectedCamera.name}
            location={selectedCamera.location}
            onClose={() => setSelectedCamera(null)}
          />
        </div>
      )}
    </div>
  );
}
