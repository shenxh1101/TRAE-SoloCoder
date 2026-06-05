import { useEffect, useState } from 'react';
import { Edit2, X, Check, Tag, MapPin } from 'lucide-react';
import { useAppStore, type Staff } from '@/stores/appStore';
import StarRating from '@/components/StarRating';

const statusLabels: Record<string, string> = { idle: '空闲', busy: '忙碌', off: '休息' };
const statusColors: Record<string, string> = { idle: 'bg-green-100 text-green-700', busy: 'bg-orange-100 text-orange-700', off: 'bg-gray-100 text-gray-600' };

export default function StaffManagement() {
  const { staff, fetchStaff, updateStaff } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Staff>>({});
  const [tagInput, setTagInput] = useState('');
  const [areaInput, setAreaInput] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setEditData({ skillTags: s.skillTags, serviceAreas: s.serviceAreas });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateStaff(editingId, editData);
    setEditingId(null);
    setEditData({});
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const tags = [...(editData.skillTags || []), tagInput.trim()];
    setEditData((d) => ({ ...d, skillTags: tags }));
    setTagInput('');
  };

  const removeTag = (idx: number) => {
    const tags = (editData.skillTags || []).filter((_, i) => i !== idx);
    setEditData((d) => ({ ...d, skillTags: tags }));
  };

  const addArea = () => {
    if (!areaInput.trim()) return;
    const areas = [...(editData.serviceAreas || []), areaInput.trim()];
    setEditData((d) => ({ ...d, serviceAreas: areas }));
    setAreaInput('');
  };

  const removeArea = (idx: number) => {
    const areas = (editData.serviceAreas || []).filter((_, i) => i !== idx);
    setEditData((d) => ({ ...d, serviceAreas: areas }));
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--secondary)' }}>人员管理</h2>

      <div className="grid gap-4">
        {staff.map((s) => {
          const isEditing = editingId === s.id;
          const displayTags = isEditing ? (editData.skillTags || []) : s.skillTags;
          const displayAreas = isEditing ? (editData.serviceAreas || []) : s.serviceAreas;

          return (
            <div key={s.id} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: 'var(--primary)' }}>
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold" style={{ color: 'var(--text)' }}>{s.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating value={s.rating} readonly size={14} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[s.status]}`}>
                    {statusLabels[s.status]}
                  </span>
                  {!isEditing ? (
                    <button onClick={() => startEdit(s)} className="p-2 rounded-lg hover:bg-gray-100" style={{ color: 'var(--text-secondary)' }}>
                      <Edit2 size={16} />
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="p-2 rounded-lg hover:bg-green-50" style={{ color: 'var(--success)' }}>
                        <Check size={16} />
                      </button>
                      <button onClick={cancelEdit} className="p-2 rounded-lg hover:bg-red-50" style={{ color: 'var(--danger)' }}>
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <Tag size={14} /> 技能标签
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {displayTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#FFF5EB', color: 'var(--primary)' }}>
                        {tag}
                        {isEditing && <button onClick={() => removeTag(idx)} className="ml-1 text-xs">××</button>}
                      </span>
                    ))}
                    {isEditing && (
                      <div className="flex gap-1">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTag()}
                          placeholder="+"
                          className="w-16 px-1.5 py-0.5 border rounded text-xs"
                          style={{ borderColor: '#E2E8F0' }}
                        />
                        <button onClick={addTag} className="text-xs" style={{ color: 'var(--primary)' }}>添加</button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <MapPin size={14} /> 服务区域
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {displayAreas.map((area, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                        {area}
                        {isEditing && <button onClick={() => removeArea(idx)} className="ml-1 text-xs">××</button>}
                      </span>
                    ))}
                    {isEditing && (
                      <div className="flex gap-1">
                        <input
                          value={areaInput}
                          onChange={(e) => setAreaInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addArea()}
                          placeholder="+"
                          className="w-16 px-1.5 py-0.5 border rounded text-xs"
                          style={{ borderColor: '#E2E8F0' }}
                        />
                        <button onClick={addArea} className="text-xs" style={{ color: 'var(--primary)' }}>添加</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                已完成 {s.totalOrders} 单 · 电话 {s.phone}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
