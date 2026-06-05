import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Crown,
  DollarSign,
  Users,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import type { Package } from '../types';

export default function PackageManager() {
  const { packages, rooms, addPackage, updatePackage, deletePackage } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Package>>({
    name: '',
    description: '',
    pricePerDay: 0,
    features: [],
    roomIds: [],
  });
  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setFormData({ ...pkg });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      pricePerDay: 0,
      features: [],
      roomIds: [],
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.pricePerDay) return;

    setSaving(true);
    try {
      if (editingId) {
        await updatePackage(editingId, formData);
      } else {
        await addPackage(formData as Omit<Package, 'id'>);
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个套餐吗？')) return;
    try {
      await deletePackage(id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRoom = (roomId: string) => {
    const current = formData.roomIds || [];
    const next = current.includes(roomId)
      ? current.filter(id => id !== roomId)
      : [...current, roomId];
    setFormData({ ...formData, roomIds: next });
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    const current = formData.features || [];
    if (!current.includes(newFeature.trim())) {
      setFormData({ ...formData, features: [...current, newFeature.trim()] });
    }
    setNewFeature('');
  };

  const removeFeature = (feature: string) => {
    const current = formData.features || [];
    setFormData({ ...formData, features: current.filter(f => f !== feature) });
  };

  const economyRooms = rooms.filter(r => r.type === 'standard');
  const luxuryRooms = rooms.filter(r => r.type === 'luxury');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">套餐管理</h2>
          <p className="text-neutral-500 mt-1">设置寄养套餐规则、价格和包含服务</p>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          新建套餐
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map((pkg) => {
          const availableCount = pkg.roomIds.filter(rid =>
            rooms.some(r => r.id === rid && r.status === 'available')
          ).length;
          const totalCount = pkg.roomIds.length;
          const isLuxury = pkg.name.includes('豪华') || pkg.pricePerDay >= 150;

          return (
            <div key={pkg.id} className="card relative overflow-hidden">
              <div className={cn(
                'absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-20',
                isLuxury ? 'bg-amber-500' : 'bg-blue-500'
              )} />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {isLuxury && (
                        <Crown size={20} className="text-amber-500" />
                      )}
                      <h3 className="text-xl font-bold text-neutral-800">{pkg.name}</h3>
                    </div>
                    <p className="text-sm text-neutral-500 mt-1">{pkg.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-500">¥{pkg.pricePerDay}</p>
                    <p className="text-xs text-neutral-400">每天</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {pkg.features.map((feature, i) => (
                    <span
                      key={i}
                      className={cn(
                        'text-xs px-2 py-1 rounded-lg',
                        isLuxury
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4">
                  <span className="flex items-center gap-1">
                    <DollarSign size={14} />
                    {pkg.roomIds.length} 间房
                  </span>
                  <span className={cn(
                    availableCount > 0 ? 'text-secondary-600' : 'text-red-500'
                  )}>
                    {availableCount} 间可用
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(pkg)}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit2 size={16} />
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-in-top">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-800">
                {editingId ? '编辑套餐' : '新建套餐'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  套餐名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：经济型、豪华型"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  套餐描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述套餐内容和特点"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  每日价格 (元) *
                </label>
                <input
                  type="number"
                  value={formData.pricePerDay}
                  onChange={(e) => setFormData({ ...formData, pricePerDay: Number(e.target.value) })}
                  placeholder="199"
                  min="0"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  包含服务
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    placeholder="输入服务内容，如：每日遛狗"
                    className="flex-1 input-field"
                  />
                  <button
                    onClick={addFeature}
                    className="btn-primary flex items-center gap-1"
                  >
                    <Plus size={16} />
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.features?.map((feature, i) => (
                    <span
                      key={i}
                      className={cn(
                        'inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg',
                        (formData.name?.includes('豪华') || (formData.pricePerDay && formData.pricePerDay >= 150))
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {feature}
                      <button
                        onClick={() => removeFeature(feature)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  包含房间
                </label>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">标准型房间</p>
                    <div className="grid grid-cols-4 gap-2">
                      {economyRooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => toggleRoom(room.id)}
                          className={cn(
                            'p-2 rounded-lg text-sm border-2 transition-all',
                            formData.roomIds?.includes(room.id)
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-neutral-200 hover:border-neutral-300'
                          )}
                        >
                          {room.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">豪华型房间</p>
                    <div className="grid grid-cols-4 gap-2">
                      {luxuryRooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => toggleRoom(room.id)}
                          className={cn(
                            'p-2 rounded-lg text-sm border-2 transition-all',
                            formData.roomIds?.includes(room.id)
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-neutral-200 hover:border-neutral-300'
                          )}
                        >
                          {room.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.pricePerDay || saving}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <><Save size={18} /> 保存</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
