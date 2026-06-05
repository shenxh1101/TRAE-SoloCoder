import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Star, Award, Calendar, Search, X, Save } from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';
import type { Caregiver } from '../types';

const SPECIALTY_OPTIONS = ['日常护理', '老年护理', '过敏护理', '幼犬护理', '术后康复', '行为训练'];

interface CaregiverFormData {
  name: string;
  avatar: string;
  specialties: string[];
  experienceYears: number;
  rating: number;
  recommendationWeight: number;
}

const defaultFormData: CaregiverFormData = {
  name: '',
  avatar: '',
  specialties: [],
  experienceYears: 0,
  rating: 5,
  recommendationWeight: 1,
};

export default function CaregiverManagement() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CaregiverFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  const loadCaregivers = async () => {
    setLoading(true);
    try {
      const result = await api.getCaregivers();
      setCaregivers(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaregivers();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const openEditModal = (caregiver: Caregiver) => {
    setEditingId(caregiver.id);
    setFormData({
      name: caregiver.name,
      avatar: caregiver.avatar,
      specialties: caregiver.specialties,
      experienceYears: caregiver.experienceYears,
      rating: caregiver.rating,
      recommendationWeight: caregiver.recommendationWeight,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.updateCaregiver(editingId, formData);
      } else {
        await api.createCaregiver(formData);
      }
      setShowModal(false);
      loadCaregivers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除护理员"${name}"吗？`)) return;
    setDeleting(id);
    try {
      await api.deleteCaregiver(id);
      setCaregivers(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const getWeightColor = (weight: number) => {
    if (weight >= 1.5) return 'text-green-600 bg-green-100';
    if (weight >= 1) return 'text-primary-600 bg-primary-100';
    if (weight >= 0.5) return 'text-warning-600 bg-warning-100';
    return 'text-red-600 bg-red-100';
  };

  const filteredCaregivers = caregivers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.specialties.some(s => s.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">护理员管理</h2>
          <p className="text-neutral-500 mt-1">管理护理员信息、专长和推荐权重</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="搜索护理员或专长..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
          </div>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            新增护理员
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCaregivers.length === 0 ? (
          <div className="col-span-full card text-center py-16">
            <Users size={48} className="mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">暂无护理员</h3>
            <p className="text-neutral-500">添加第一位护理员开始管理</p>
          </div>
        ) : (
          filteredCaregivers.map((caregiver) => (
            <div key={caregiver.id} className="card card-hover group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-neutral-100">
                  <img src={caregiver.avatar} alt={caregiver.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-800">{caregiver.name}</h3>
                      <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
                        <Calendar size={14} />
                        {caregiver.experienceYears}年经验
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(caregiver)}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={16} className="text-neutral-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(caregiver.id, caregiver.name)}
                        disabled={deleting === caregiver.id}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="删除"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-yellow-700">{caregiver.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-neutral-400">{caregiver.reviewCount}条评价</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-neutral-100">
                <div>
                  <p className="text-xs text-neutral-500 mb-2">专长领域</p>
                  <div className="flex flex-wrap gap-1">
                    {caregiver.specialties.length === 0 ? (
                      <span className="text-xs text-neutral-400">暂无专长</span>
                    ) : (
                      caregiver.specialties.map((specialty, i) => (
                        <span key={i} className="badge badge-primary text-[10px]">{specialty}</span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-neutral-500 mb-2">推荐权重</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all"
                        style={{ width: `${(caregiver.recommendationWeight / 2) * 100}%` }}
                      />
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-lg text-xs font-medium',
                      getWeightColor(caregiver.recommendationWeight)
                    )}>
                      {caregiver.recommendationWeight.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Award size={16} className="text-primary-500" />
                  <p className="text-xs text-neutral-500">
                    {caregiver.recommendationWeight >= 1.5 ? '高优先级推荐' :
                     caregiver.recommendationWeight >= 1 ? '正常推荐' :
                     caregiver.recommendationWeight >= 0.5 ? '低优先级推荐' : '暂不推荐'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-sm text-neutral-500">
        共 {filteredCaregivers.length} 条记录
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <h3 className="text-xl font-bold text-neutral-800">
                {editingId ? '编辑护理员' : '新增护理员'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入护理员姓名"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  头像URL (可选)
                </label>
                <input
                  type="url"
                  value={formData.avatar}
                  onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                  placeholder="留空将自动生成头像"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    经验 (年) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, experienceYears: parseFloat(e.target.value) }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    评分 *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    权重 *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={formData.recommendationWeight}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendationWeight: parseFloat(e.target.value) }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  专长领域
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map(specialty => (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() => toggleSpecialty(specialty)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                        formData.specialties.includes(specialty)
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      )}
                    >
                      {specialty}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>保存中...</>
                  ) : (
                    <>
                      <Save size={18} />
                      {editingId ? '保存修改' : '创建'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
