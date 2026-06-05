import { useEffect, useState, useRef } from 'react';
import { Map } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAdminStore from '@/stores/adminStore';

const TIME_RANGES = [
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '近3个月', value: '3m' },
  { label: '近1年', value: '1y' },
];

function getHeatColor(count: number, max: number): string {
  const ratio = count / max;
  if (ratio > 0.7) return '#ef4444';
  if (ratio > 0.4) return '#f59e0b';
  return '#22c55e';
}

function getHeatRadius(count: number, max: number): number {
  const ratio = count / max;
  return Math.max(8, Math.round(ratio * 24));
}

export default function AdminHeatmap() {
  const { heatmapData, fetchHeatmap, loading } = useAdminStore();
  const [timeRange, setTimeRange] = useState('30d');
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const circleLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    fetchHeatmap(timeRange);
  }, [timeRange, fetchHeatmap]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([31.23, 121.47], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
      circleLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    circleLayerRef.current!.clearLayers();
    const data = heatmapData;
    const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 1;

    data.forEach((d) => {
      if (!d.lat || !d.lng) return;
      L.circleMarker([d.lat, d.lng], {
        radius: getHeatRadius(d.count, maxCount),
        fillColor: getHeatColor(d.count, maxCount),
        color: getHeatColor(d.count, maxCount),
        weight: 1,
        opacity: 0.6,
        fillOpacity: 0.4,
      }).bindPopup(`<b>${d.city}${d.district ? ' ' + d.district : ''}</b><br/>救助次数: ${d.count}`).addTo(circleLayerRef.current!);
    });

    if (data.length > 0) {
      const bounds = data.filter(d => d.lat && d.lng).map(d => [d.lat, d.lng] as [number, number]);
      if (bounds.length > 0) mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }

    setTimeout(() => mapRef.current?.invalidateSize(), 200);
  }, [heatmapData]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const data = heatmapData;
  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Map className="text-primary-500" size={28} />
        <h1 className="section-title">区域救助热力图</h1>
      </div>

      <div className="card p-4 flex gap-2">
        {TIME_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => setTimeRange(range.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              timeRange === range.value
                ? 'bg-primary-500 text-white'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-6 animate-pulse">
          <div className="w-24 h-5 bg-warm-200 rounded mb-4" />
          <div className="w-full h-80 bg-warm-200 rounded" />
        </div>
      ) : data.length === 0 ? (
        <div className="card p-12 text-center">
          <Map className="w-12 h-12 text-warm-300 mx-auto mb-3" />
          <p className="text-warm-400">暂无热力数据</p>
          <p className="text-warm-300 text-sm mt-1">选择其他时间范围查看</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="p-4 border-b border-warm-100">
              <h2 className="font-bold text-warm-800">热力分布</h2>
            </div>
            <div ref={mapContainerRef} className="w-full h-96" />
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-warm-800">图例</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500" />
                <span className="text-sm text-warm-600">高密度 (&gt;70%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-amber-400" />
                <span className="text-sm text-warm-600">中密度 (40-70%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-sm text-warm-600">低密度 (&lt;40%)</span>
              </div>
            </div>

            <h2 className="font-bold text-warm-800 mt-6">排名</h2>
            <div className="space-y-2">
              {[...data].sort((a, b) => b.count - a.count).slice(0, 8).map((d, i) => (
                <div key={d.district || i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < 3 ? 'bg-primary-500 text-white' : 'bg-warm-200 text-warm-500'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-warm-700">{d.city}{d.district ? ' ' + d.district : ''}</span>
                  </div>
                  <span className="text-sm font-medium text-warm-800">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
