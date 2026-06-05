import { useState } from 'react';
import { Search, Download, Sparkles } from 'lucide-react';
import { recommend, computeSimilarity } from '@/engine/recommendation';
import { useStore } from '@/store';

const catalogEventsData = [
  { id: 'evt-1', time: '2024-01-15 08:12:00', lat: 31.0, lon: 103.4, depth: 14.5, magnitude: 5.8, region: '四川汶川', mechanism: { strike: 125, dip: 42, rake: 8 }, mt: [0.2, -0.1, -0.1, 0.05, 0.02, 0.9], velocityModelId: 'IASP91' },
  { id: 'evt-2', time: '2024-01-15 09:23:00', lat: 30.8, lon: 103.2, depth: 12.3, magnitude: 4.2, region: '四川汶川', mechanism: { strike: 130, dip: 38, rake: 12 }, mt: [0.15, -0.08, -0.07, 0.03, 0.01, 0.7], velocityModelId: 'IASP91' },
  { id: 'evt-3', time: '2024-01-16 10:45:00', lat: 26.8, lon: 100.2, depth: 8.5, magnitude: 3.5, region: '云南丽江', mechanism: null, mt: null, velocityModelId: 'IASP91' },
  { id: 'evt-4', time: '2024-01-16 11:30:00', lat: 33.0, lon: 97.0, depth: 25.0, magnitude: 5.2, region: '青海玉树', mechanism: { strike: 280, dip: 55, rake: 85 }, mt: [0.9, -0.45, -0.45, 0.1, 0.05, 0.3], velocityModelId: 'PREM' },
  { id: 'evt-5', time: '2024-01-17 08:00:00', lat: 34.5, lon: 104.0, depth: 18.0, magnitude: 4.8, region: '甘肃岷县', mechanism: { strike: 110, dip: 48, rake: -5 }, mt: [0.1, -0.05, -0.05, 0.02, 0.01, 0.6], velocityModelId: 'IASP91' },
  { id: 'evt-6', time: '2024-01-17 09:15:00', lat: 36.8, lon: 81.5, depth: 32.0, magnitude: 5.5, region: '新疆于田', mechanism: { strike: 350, dip: 60, rake: 170 }, mt: [-0.8, 0.4, 0.4, 0.08, 0.04, 0.2], velocityModelId: 'AK135' },
  { id: 'evt-7', time: '2024-01-18 10:30:00', lat: 29.5, lon: 90.2, depth: 15.0, magnitude: 3.8, region: '西藏尼木', mechanism: null, mt: null, velocityModelId: 'IASP91' },
  { id: 'evt-8', time: '2024-01-18 14:20:00', lat: 39.6, lon: 118.2, depth: 22.0, magnitude: 4.5, region: '河北唐山', mechanism: { strike: 210, dip: 45, rake: -10 }, mt: [0.3, -0.15, -0.15, 0.06, 0.02, 0.5], velocityModelId: 'PREM' },
  { id: 'evt-9', time: '2024-01-19 07:45:00', lat: 24.0, lon: 121.5, depth: 28.0, magnitude: 5.1, region: '台湾花莲', mechanism: { strike: 55, dip: 50, rake: 95 }, mt: [0.7, -0.35, -0.35, 0.12, 0.06, 0.4], velocityModelId: 'IASP91' },
  { id: 'evt-10', time: '2024-01-19 08:30:00', lat: 25.5, lon: 118.8, depth: 10.0, magnitude: 3.2, region: '福建南安', mechanism: null, mt: null, velocityModelId: 'IASP91' },
  { id: 'evt-11', time: '2024-01-20 09:00:00', lat: 21.5, lon: 109.2, depth: 5.0, magnitude: 2.8, region: '广西北海', mechanism: null, mt: null, velocityModelId: 'IASP91' },
  { id: 'evt-12', time: '2024-01-20 10:15:00', lat: 31.2, lon: 103.6, depth: 16.0, magnitude: 4.9, region: '四川汶川', mechanism: { strike: 128, dip: 40, rake: 5 }, mt: [0.25, -0.12, -0.13, 0.04, 0.02, 0.85], velocityModelId: 'IASP91' },
  { id: 'evt-13', time: '2024-01-21 11:30:00', lat: 30.5, lon: 102.8, depth: 11.0, magnitude: 3.9, region: '四川汶川', mechanism: { strike: 132, dip: 35, rake: 15 }, mt: [0.18, -0.09, -0.09, 0.03, 0.01, 0.65], velocityModelId: 'IASP91' },
  { id: 'evt-14', time: '2024-01-21 13:45:00', lat: 27.0, lon: 100.5, depth: 9.0, magnitude: 4.1, region: '云南丽江', mechanism: { strike: 180, dip: 42, rake: 20 }, mt: [0.22, -0.11, -0.11, 0.04, 0.02, 0.55], velocityModelId: 'IASP91' },
  { id: 'evt-15', time: '2024-01-22 08:20:00', lat: 33.2, lon: 96.8, depth: 22.0, magnitude: 5.0, region: '青海玉树', mechanism: { strike: 275, dip: 58, rake: 80 }, mt: [0.85, -0.42, -0.43, 0.09, 0.05, 0.35], velocityModelId: 'PREM' },
  { id: 'evt-16', time: '2024-01-22 09:10:00', lat: 34.8, lon: 104.2, depth: 19.0, magnitude: 4.6, region: '甘肃岷县', mechanism: { strike: 115, dip: 50, rake: 0 }, mt: [0.12, -0.06, -0.06, 0.02, 0.01, 0.58], velocityModelId: 'IASP91' },
  { id: 'evt-17', time: '2024-01-23 10:00:00', lat: 37.0, lon: 81.8, depth: 30.0, magnitude: 5.3, region: '新疆于田', mechanism: { strike: 345, dip: 62, rake: 165 }, mt: [-0.75, 0.38, 0.37, 0.07, 0.03, 0.25], velocityModelId: 'AK135' },
  { id: 'evt-18', time: '2024-01-23 11:20:00', lat: 29.8, lon: 90.5, depth: 14.0, magnitude: 3.6, region: '西藏尼木', mechanism: null, mt: null, velocityModelId: 'IASP91' },
  { id: 'evt-19', time: '2024-01-24 14:30:00', lat: 39.8, lon: 118.0, depth: 20.0, magnitude: 4.3, region: '河北唐山', mechanism: { strike: 205, dip: 48, rake: -15 }, mt: [0.28, -0.14, -0.14, 0.05, 0.02, 0.52], velocityModelId: 'PREM' },
  { id: 'evt-20', time: '2024-01-24 16:45:00', lat: 23.8, lon: 121.8, depth: 25.0, magnitude: 4.7, region: '台湾花莲', mechanism: { strike: 60, dip: 52, rake: 90 }, mt: [0.65, -0.32, -0.33, 0.11, 0.05, 0.45], velocityModelId: 'IASP91' },
];

const magColor = (m: number) => {
  const v = parseFloat(String(m));
  if (v < 3) return 'text-green-400';
  if (v < 4) return 'text-seismo-amber';
  return 'text-seismo-red';
};

export default function Catalog() {
  const setInitialMt = useStore((s) => s.setInitialMt);
  const [catalogEvents] = useState(catalogEventsData);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recLat, setRecLat] = useState(31.0);
  const [recLon, setRecLon] = useState(103.5);
  const [recDepth, setRecDepth] = useState(15);
  const [recMag, setRecMag] = useState(5.0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minLat, setMinLat] = useState('');
  const [maxLat, setMaxLat] = useState('');
  const [minLon, setMinLon] = useState('');
  const [maxLon, setMaxLon] = useState('');
  const [minMag, setMinMag] = useState('');
  const [maxMag, setMaxMag] = useState('');
  const [filteredEvents, setFilteredEvents] = useState(catalogEventsData);
  const [recommendations, setRecommendations] = useState<Array<{
    eventId: string;
    similarity: number;
    reason: string;
    initialModel: { mt: number[]; velocityModelId: string };
  }>>([]);
  const perPage = 10;
  const totalPages = Math.ceil(filteredEvents.length / perPage);
  const pageEvents = filteredEvents.slice((page - 1) * perPage, page * perPage);

  const getRecommendations = () => {
    const recs = recommend(
      { lat: recLat, lon: recLon, depth: recDepth, magnitude: recMag },
      catalogEvents,
      3
    );
    setRecommendations(recs);
  };

  const handleQuery = () => {
    let filtered = [...catalogEvents];
    if (startDate) {
      filtered = filtered.filter(e => e.time >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(e => e.time <= endDate + ' 23:59:59');
    }
    if (minLat) {
      filtered = filtered.filter(e => e.lat >= parseFloat(minLat));
    }
    if (maxLat) {
      filtered = filtered.filter(e => e.lat <= parseFloat(maxLat));
    }
    if (minLon) {
      filtered = filtered.filter(e => e.lon >= parseFloat(minLon));
    }
    if (maxLon) {
      filtered = filtered.filter(e => e.lon <= parseFloat(maxLon));
    }
    if (minMag) {
      filtered = filtered.filter(e => e.magnitude >= parseFloat(minMag));
    }
    if (maxMag) {
      filtered = filtered.filter(e => e.magnitude <= parseFloat(maxMag));
    }
    setFilteredEvents(filtered);
    setPage(1);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setMinLat('');
    setMaxLat('');
    setMinLon('');
    setMaxLon('');
    setMinMag('');
    setMaxMag('');
    setFilteredEvents(catalogEvents);
    setPage(1);
  };

  const handleExportCSV = () => {
    const headers = ['ID', '时间', '纬度', '经度', '深度(km)', '震级', '区域', '走向', '倾角', '滑动角'];
    const rows = filteredEvents.map(e => [
      e.id,
      e.time,
      e.lat,
      e.lon,
      e.depth,
      e.magnitude,
      e.region,
      e.mechanism?.strike ?? '',
      e.mechanism?.dip ?? '',
      e.mechanism?.rake ?? ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalog_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    console.log('PDF export triggered');
  };

  const handleApplyModel = (rec: { eventId: string; similarity: number; reason: string; initialModel: { mt: number[]; velocityModelId: string } }) => {
    const mt = rec.initialModel.mt;
    setInitialMt({
      mrr: mt[0],
      mtt: mt[1],
      mpp: mt[2],
      mrt: mt[3],
      mrp: mt[4],
      mtp: mt[5],
    });
  };

  return (
    <div className="page-container">
      <h1 className="section-title mb-6"><Search className="w-5 h-5 text-seismo-cyan" />目录与推荐</h1>

      <div className="glass-panel p-4 mb-6">
        <div className="grid grid-cols-9 gap-3 items-end">
          <div>
            <label className="text-xs text-seismo-text-muted mb-1 block">起始时间</label>
            <input type="date" className="input-field w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-seismo-text-muted mb-1 block">结束时间</label>
            <input type="date" className="input-field w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-seismo-text-muted mb-1 block">纬度范围</label>
            <div className="flex gap-1">
              <input type="number" placeholder="最小" className="input-field w-full" value={minLat} onChange={(e) => setMinLat(e.target.value)} />
              <input type="number" placeholder="最大" className="input-field w-full" value={maxLat} onChange={(e) => setMaxLat(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-seismo-text-muted mb-1 block">经度范围</label>
            <div className="flex gap-1">
              <input type="number" placeholder="最小" className="input-field w-full" value={minLon} onChange={(e) => setMinLon(e.target.value)} />
              <input type="number" placeholder="最大" className="input-field w-full" value={maxLon} onChange={(e) => setMaxLon(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-seismo-text-muted mb-1 block">震级范围</label>
            <div className="flex gap-1">
              <input type="number" placeholder="最小" className="input-field w-full" step="0.1" value={minMag} onChange={(e) => setMinMag(e.target.value)} />
              <input type="number" placeholder="最大" className="input-field w-full" step="0.1" value={maxMag} onChange={(e) => setMaxMag(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary flex items-center justify-center gap-1" onClick={handleQuery}><Search className="w-4 h-4" />查询</button>
          <button className="btn-secondary" onClick={handleReset}>重置</button>
          <button className="btn-secondary flex items-center justify-center gap-1" onClick={handleExportCSV}><Download className="w-4 h-4" />CSV</button>
          <button className="btn-secondary flex items-center justify-center gap-1" onClick={handleExportPDF}><Download className="w-4 h-4" />PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <div className="glass-panel p-4">
            <h2 className="section-title mb-4 text-base">历史震源目录</h2>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-seismo-border text-seismo-text-muted text-left">
                    <th className="py-2 px-3">序号</th>
                    <th className="py-2 px-3">时间</th>
                    <th className="py-2 px-3">纬度</th>
                    <th className="py-2 px-3">经度</th>
                    <th className="py-2 px-3">深度(km)</th>
                    <th className="py-2 px-3">震级</th>
                    <th className="py-2 px-3">机制</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEvents.map((evt, idx) => (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedId(evt.id)}
                      className={`border-b border-seismo-border/30 cursor-pointer transition-colors hover:bg-seismo-cyan/5 ${idx % 2 === 1 ? 'bg-seismo-panel/40' : ''} ${selectedId === evt.id ? 'bg-seismo-cyan/10' : ''}`}
                    >
                      <td className="py-2 px-3 text-seismo-text-muted">{(page - 1) * perPage + idx + 1}</td>
                      <td className="py-2 px-3 text-seismo-text-dim font-mono text-xs">{evt.time}</td>
                      <td className="py-2 px-3 font-mono">{evt.lat}</td>
                      <td className="py-2 px-3 font-mono">{evt.lon}</td>
                      <td className="py-2 px-3 font-mono">{evt.depth}</td>
                      <td className={`py-2 px-3 font-mono font-bold ${magColor(evt.magnitude)}`}>{evt.magnitude}</td>
                      <td className="py-2 px-3">
                        {evt.mechanism ? (
                          <span className="text-xs text-seismo-cyan font-mono">
                            {evt.mechanism.strike}/{evt.mechanism.dip}/{evt.mechanism.rake}
                          </span>
                        ) : (
                          <span className="text-seismo-text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-seismo-border/30">
              <span className="text-xs text-seismo-text-muted">第 {page} 页，共 {totalPages} 页</span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-xs px-3 py-1"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >上一页</button>
                <button
                  className="btn-secondary text-xs px-3 py-1"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >下一页</button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4">
          <div className="glass-panel p-4">
            <h2 className="section-title mb-4 text-base"><Sparkles className="w-4 h-4 text-seismo-cyan" />智能推荐引擎</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs text-seismo-text-muted mb-1 block">纬度</label>
                <input type="number" className="input-field w-full" placeholder="31.0" step="0.01" value={recLat} onChange={(e) => setRecLat(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-seismo-text-muted mb-1 block">经度</label>
                <input type="number" className="input-field w-full" placeholder="103.5" step="0.01" value={recLon} onChange={(e) => setRecLon(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-seismo-text-muted mb-1 block">深度</label>
                <input type="number" className="input-field w-full" placeholder="15" step="0.1" value={recDepth} onChange={(e) => setRecDepth(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-seismo-text-muted mb-1 block">震级</label>
                <input type="number" className="input-field w-full" placeholder="5.0" step="0.1" value={recMag} onChange={(e) => setRecMag(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <button className="btn-primary w-full flex items-center justify-center gap-1 mb-4" onClick={getRecommendations}>
              <Sparkles className="w-4 h-4" />获取推荐
            </button>

            <div className="space-y-3">
              {recommendations.map(rec => {
                const evt = catalogEvents.find(e => e.id === rec.eventId);
                const barColor = rec.similarity >= 80 ? 'bg-seismo-cyan' : rec.similarity >= 60 ? 'bg-seismo-amber' : 'bg-seismo-text-muted';
                return (
                  <div key={rec.eventId} className="glass-card p-3 border-l-2 border-l-seismo-cyan">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-seismo-text-muted">{rec.eventId}</span>
                      <span className="text-sm font-mono font-bold text-seismo-cyan">{rec.similarity.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-seismo-bg rounded-full mb-2 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(5, rec.similarity)}%` }} />
                    </div>
                    <p className="text-xs text-seismo-text-dim mb-2">{rec.reason}</p>
                    <div className="text-xs text-seismo-text-muted font-mono mb-2">
                      {evt ? `${evt.region} | M${evt.magnitude} | ${evt.depth}km` : ''}
                    </div>
                    <div className="text-xs text-seismo-text-muted mb-2">
                      模型: {rec.initialModel.velocityModelId} | MT: [{rec.initialModel.mt.map(v => v.toFixed(1)).join(', ')}]
                    </div>
                    <button className="btn-secondary text-xs w-full py-1" onClick={() => handleApplyModel(rec)}>应用模型</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
