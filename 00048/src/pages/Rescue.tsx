import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, MapPin, Clock, User, Filter, Map, List, CheckCircle, Navigation, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAnimalStore from '@/stores/animalStore';

type StatusFilter = '' | 'pending' | 'in_progress' | 'completed';

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
];

const statusLabels: Record<string, string> = {
  pending: '待处理',
  assigned: '已分配',
  in_progress: '救助中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusBadgeClass: Record<string, string> = {
  pending: 'badge-pending',
  assigned: 'badge-active',
  in_progress: 'badge-active',
  completed: 'badge-success',
  cancelled: 'badge-info',
};

function urgencyBadge(urgency: string) {
  if (urgency === 'critical' || urgency === 'high') return 'badge-urgent';
  if (urgency === 'medium') return 'badge-pending';
  return 'badge-info';
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function Rescue() {
  const { rescueTasks, fetchRescueTasks, acceptTask, updateTaskStatus, loading } = useAnimalStore();
  const [filter, setFilter] = useState<StatusFilter>('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    fetchRescueTasks(filter || undefined);
  }, [filter, fetchRescueTasks]);

  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([31.23, 121.47], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
      markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    markerLayerRef.current!.clearLayers();

    const icon = L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f97316" width="24" height="24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      className: '',
    });

    rescueTasks.forEach((task) => {
      if (!task.lat || !task.lng) return;
      L.marker([task.lat, task.lng], { icon }).addTo(markerLayerRef.current!).bindPopup(`<b>${task.address}</b><br/>状态: ${statusLabels[task.status] || task.status}`);
    });

    const points = rescueTasks.filter(t => t.lat && t.lng).map(t => [t.lat, t.lng] as [number, number]);
    if (points.length > 0) mapRef.current.fitBounds(points, { padding: [40, 40] });

    setTimeout(() => mapRef.current?.invalidateSize(), 200);
  }, [viewMode, rescueTasks]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleAccept = async (id: string) => {
    await acceptTask(id);
    fetchRescueTasks(filter || undefined);
  };

  const handleUpdate = async (id: string) => {
    await updateTaskStatus(id, 'rescuing');
    fetchRescueTasks(filter || undefined);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary-500" />
          <h1 className="section-title">救助任务中心</h1>
        </div>
        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
        >
          {viewMode === 'list' ? <Map className="w-4 h-4" /> : <List className="w-4 h-4" />}
          {viewMode === 'list' ? '地图' : '列表'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === tab.value
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-warm-400 py-8">加载中...</p>}

      {!loading && viewMode === 'list' && (
        <div className="space-y-4">
          {rescueTasks.length === 0 && (
            <div className="text-center py-16 text-warm-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无救助任务</p>
            </div>
          )}
          {rescueTasks.map((task) => (
            <Link key={task.id} to={`/rescue/${task.id}`} className="card p-5 block hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={urgencyBadge(task.urgency)}>
                    {task.urgency === 'critical' ? '紧急' : task.urgency === 'high' ? '高' : task.urgency === 'medium' ? '中' : '低'}
                  </span>
                  <span className={statusBadgeClass[task.status] || 'badge'}>
                    {statusLabels[task.status] || task.status}
                  </span>
                </div>
                <span className="text-xs text-warm-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {relativeTime(task.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-warm-700 text-sm mb-2">
                <MapPin className="w-4 h-4 text-primary-400 shrink-0" />
                <span className="truncate">{task.address}</span>
              </div>
              {task.description && (
                <p className="text-sm text-warm-500 mb-3 line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {task.volunteerName && (
                    <span className="text-xs text-warm-500 flex items-center gap-1">
                      <User className="w-3 h-3" /> {task.volunteerName}
                    </span>
                  )}
                </div>
                <div onClick={(e) => e.preventDefault()}>
                  {task.status === 'pending' && (
                    <button onClick={() => handleAccept(task.id)} className="btn-primary px-4 py-1.5 text-sm">
                      <Navigation className="w-3.5 h-3.5 inline mr-1" /> 接单
                    </button>
                  )}
                  {(task.status === 'assigned' || task.status === 'in_progress') && (
                    <button onClick={() => handleUpdate(task.id)} className="btn-outline px-4 py-1.5 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> 更新状态
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && viewMode === 'map' && (
        <div className="relative h-[500px] rounded-2xl overflow-hidden border border-warm-200">
          <div ref={mapContainerRef} className="w-full h-full" />
          {rescueTasks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-warm-400 bg-warm-50">
              <AlertCircle className="w-10 h-10 mr-2 opacity-40" /> 暂无任务
            </div>
          )}
        </div>
      )}
    </div>
  );
}
