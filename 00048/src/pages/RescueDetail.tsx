import { useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, User, CheckCircle, Navigation, Phone, FileText, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAnimalStore from '@/stores/animalStore';

const timelineSteps = [
  { key: 'pending', label: '待处理' },
  { key: 'in_progress', label: '救助中' },
  { key: 'completed', label: '已完成' },
];

function getStepIndex(status: string) {
  const idx = timelineSteps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

const urgencyLabel: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

const urgencyColor: Record<string, string> = {
  low: 'badge-info',
  medium: 'badge-pending',
  high: 'badge-urgent',
  critical: 'badge-urgent',
};

const statusLabel: Record<string, string> = {
  pending: '待处理',
  assigned: '已分配',
  in_progress: '救助中',
  completed: '已完成',
  cancelled: '已取消',
};

export default function RescueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rescueTasks, fetchRescueTasks, acceptTask, updateTaskStatus, loading } = useAnimalStore();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRescueTasks();
  }, [fetchRescueTasks]);

  const task = rescueTasks.find((t) => t.id === id);

  useEffect(() => {
    if (!task?.lat || !task?.lng || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([task.lat, task.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([task.lat, task.lng], 15);
    }

    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) mapRef.current!.removeLayer(layer);
    });

    const icon = L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f97316" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      className: '',
    });

    L.marker([task.lat, task.lng], { icon }).addTo(mapRef.current).bindPopup(task.address || '救助位置').openPopup();

    setTimeout(() => mapRef.current?.invalidateSize(), 200);
  }, [task]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleAccept = async () => {
    if (!id) return;
    await acceptTask(id);
    fetchRescueTasks();
  };

  const handleComplete = async () => {
    if (!id) return;
    await updateTaskStatus(id, 'completed');
    fetchRescueTasks();
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6 text-center text-warm-400 py-20">加载中...</div>;
  }

  if (!task) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-20">
        <p className="text-warm-400 mb-4">未找到该救助任务</p>
        <Link to="/rescue" className="btn-primary inline-block">返回任务列表</Link>
      </div>
    );
  }

  const stepIndex = getStepIndex(task.status);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <button onClick={() => navigate('/rescue')} className="flex items-center gap-2 text-warm-500 hover:text-primary-500 transition-colors">
        <ArrowLeft className="w-5 h-5" /> 返回任务列表
      </button>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-warm-800 mb-6">救助进度</h2>
        <div className="relative pl-6">
          {timelineSteps.map((step, i) => {
            const done = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <div key={step.key} className="relative pb-8 last:pb-0">
                {i < timelineSteps.length - 1 && (
                  <div className={`absolute left-[-18px] top-[22px] w-0.5 h-full ${done ? 'bg-primary-400' : 'bg-warm-200'}`} />
                )}
                <div className={`absolute left-[-24px] top-[6px] w-3 h-3 rounded-full border-2 ${
                  current ? 'border-primary-500 bg-primary-500 ring-4 ring-primary-100' : done ? 'border-primary-400 bg-primary-400' : 'border-warm-300 bg-white'
                }`} />
                <div>
                  <p className={`font-medium ${done ? 'text-warm-800' : 'text-warm-400'}`}>{step.label}</p>
                  {current && (
                    <span className="badge-active text-xs mt-1">当前状态</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-warm-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" /> 任务信息
        </h2>
        <div className="flex items-center justify-between">
          <span className={`badge ${urgencyColor[task.urgency] || 'badge'}`}>
            紧急程度：{urgencyLabel[task.urgency] || task.urgency}
          </span>
          <span className="badge-active">{statusLabel[task.status] || task.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary-400" />
          <span className="text-warm-700">{task.address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-warm-500">
          <Clock className="w-4 h-4" />
          <span>创建时间：{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
        </div>
        {task.description && (
          <p className="text-warm-600 text-sm bg-warm-50 p-3 rounded-xl">{task.description}</p>
        )}
        {task.notes && (
          <p className="text-warm-600 text-sm bg-primary-50 p-3 rounded-xl">备注：{task.notes}</p>
        )}
        {task.volunteerName && (
          <div className="flex items-center gap-2 text-sm text-warm-600 bg-primary-50 p-3 rounded-xl">
            <User className="w-4 h-4 text-primary-500" />
            <span>志愿者：{task.volunteerName}</span>
            <Phone className="w-4 h-4 text-primary-400 ml-auto" />
          </div>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-warm-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-500" /> 位置信息
        </h2>
        <div
          ref={mapContainerRef}
          className="w-full h-56 rounded-xl overflow-hidden border border-warm-200"
        />
        <div className="flex gap-3">
          <a
            href={`https://uri.amap.com/navigation?to=${task.lng},${task.lat},${encodeURIComponent(task.address)}&mode=bus`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline flex-1 flex items-center justify-center gap-2 text-sm"
          >
            <Navigation className="w-4 h-4" /> 高德导航
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={`http://api.map.baidu.com/direction?destination=latlng:${task.lat},${task.lng}|name:${encodeURIComponent(task.address)}&mode=transit`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline flex-1 flex items-center justify-center gap-2 text-sm"
          >
            <Navigation className="w-4 h-4" /> 百度导航
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="flex gap-3">
        {task.status === 'pending' && (
          <button onClick={handleAccept} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" /> 接单救助
          </button>
        )}
        {(task.status === 'assigned' || task.status === 'in_progress') && (
          <>
            <a
              href={`https://uri.amap.com/navigation?to=${task.lng},${task.lat}&mode=bus`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline flex-1 flex items-center justify-center gap-2"
            >
              <Navigation className="w-5 h-5" /> 导航前往
            </a>
            <button onClick={handleComplete} className="btn-success flex-1 flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> 标记完成
            </button>
          </>
        )}
        {task.status === 'completed' && (
          <div className="flex-1 text-center py-3 text-success-600 font-medium flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" /> 任务已完成
          </div>
        )}
      </div>
    </div>
  );
}
