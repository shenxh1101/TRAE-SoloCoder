import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  PawPrint,
  Syringe,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { useAppStore } from '../store';
import type { Pet, VaccineRecord } from '../types';

export default function PetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  const { pets, createPet, updatePet, currentUser } = useAppStore();

  const existingPet = pets.find(p => p.id === id);

  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: '',
    weight: '',
    avatar: '',
    vaccines: [] as Omit<VaccineRecord, 'id'>[],
    allergies: [] as string[],
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newVaccine, setNewVaccine] = useState({ name: '', date: '', nextDate: '' });
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingPet) {
      setFormData({
        name: existingPet.name,
        breed: existingPet.breed,
        age: existingPet.age.toString(),
        weight: existingPet.weight.toString(),
        avatar: existingPet.avatar,
        vaccines: existingPet.vaccines,
        allergies: existingPet.allergies,
      });
    }
  }, [existingPet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);

    try {
      const petData = {
        name: formData.name,
        breed: formData.breed,
        age: parseFloat(formData.age),
        weight: parseFloat(formData.weight),
        avatar: formData.avatar || `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(formData.breed + ' pet portrait')}&image_size=square`,
        userId: currentUser.id,
        vaccines: formData.vaccines as VaccineRecord[],
        allergies: formData.allergies,
      };

      if (isEdit && id) {
        await updatePet(id, petData);
      } else {
        await createPet(petData);
      }

      navigate('/pets');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addVaccine = () => {
    if (!newVaccine.name || !newVaccine.date) return;

    const vaccine: any = {
      name: newVaccine.name,
      date: newVaccine.date,
      status: 'completed',
    };

    setFormData(prev => ({
      ...prev,
      vaccines: [...prev.vaccines, vaccine],
    }));
    setNewVaccine({ name: '', date: '', nextDate: '' });
    setShowVaccineForm(false);
  };

  const removeVaccine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      vaccines: prev.vaccines.filter((_, i) => i !== index),
    }));
  };

  const addAllergy = () => {
    if (!newAllergy.trim() || formData.allergies.includes(newAllergy.trim())) return;
    setFormData(prev => ({
      ...prev,
      allergies: [...prev.allergies, newAllergy.trim()],
    }));
    setNewAllergy('');
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/pets')}
          className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">
            {isEdit ? '编辑宠物档案' : '新增宠物档案'}
          </h2>
          <p className="text-neutral-500 mt-1">
            {isEdit ? '修改宠物的基本信息和健康记录' : '为您的爱宠创建健康档案'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <PawPrint size={20} className="text-primary-500" />
            基本信息
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 bg-neutral-100 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="Pet avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Camera size={24} className="mx-auto text-neutral-400 mb-1" />
                      <span className="text-xs text-neutral-400">自动生成</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      宠物名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="请输入宠物名称"
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
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                品种 *
              </label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                placeholder="如：金毛犬、英国短毛猫"
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  年龄 (岁) *
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="0.5"
                  step="0.1"
                  min="0"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  体重 (kg) *
                </label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="5.0"
                  step="0.1"
                  min="0"
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
              <Syringe size={20} className="text-secondary-500" />
              疫苗接种记录
            </h3>
            <button
              type="button"
              onClick={() => setShowVaccineForm(!showVaccineForm)}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              添加记录
            </button>
          </div>

          {showVaccineForm && (
            <div className="bg-neutral-50 rounded-xl p-4 mb-4 animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    疫苗名称
                  </label>
                  <input
                    type="text"
                    value={newVaccine.name}
                    onChange={(e) => setNewVaccine(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="如：狂犬疫苗"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    接种日期
                  </label>
                  <input
                    type="date"
                    value={newVaccine.date}
                    onChange={(e) => setNewVaccine(prev => ({ ...prev, date: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    下次接种
                  </label>
                  <input
                    type="date"
                    value={newVaccine.nextDate}
                    onChange={(e) => setNewVaccine(prev => ({ ...prev, nextDate: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowVaccineForm(false)}
                  className="btn-secondary py-2"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={addVaccine}
                  className="btn-primary py-2"
                >
                  添加
                </button>
              </div>
            </div>
          )}

          {formData.vaccines.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <Syringe size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无疫苗记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.vaccines.map((vaccine, index) => (
                <div
                  key={(vaccine as any).id || index}
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                      <Syringe size={16} className="text-secondary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">{vaccine.name}</p>
                      <p className="text-xs text-neutral-500">
                        接种: {vaccine.date}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVaccine(index)}
                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            过敏史
          </h3>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
              placeholder="输入过敏原，如：青霉素、海鲜"
              className="input-field"
            />
            <button
              type="button"
              onClick={addAllergy}
              className="btn-primary px-4"
            >
              <Plus size={18} />
            </button>
          </div>

          {formData.allergies.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">
              无过敏史
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {formData.allergies.map((allergy, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm"
                >
                  {allergy}
                  <button
                    type="button"
                    onClick={() => removeAllergy(index)}
                    className="hover:bg-red-100 rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/pets')}
            className="btn-secondary"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>保存中...</>
            ) : (
              <>
                <Save size={18} />
                {isEdit ? '保存修改' : '创建档案'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
