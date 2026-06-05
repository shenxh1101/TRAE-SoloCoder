import { useState, useEffect } from 'react';
import { PawPrint, Edit2, Trash2, Syringe, AlertTriangle, User, Search } from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';
import type { Pet } from '../types';

export default function PetManagement() {
  const [pets, setPets] = useState<(Pet & { ownerName?: string; ownerEmail?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadPets = async () => {
    setLoading(true);
    try {
      const result = await api.getAllPets();
      setPets(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除宠物档案"${name}"吗？`)) return;
    setDeleting(id);
    try {
      await api.deletePet(id);
      setPets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const filteredPets = pets.filter(pet =>
    pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h2 className="text-2xl font-bold text-neutral-800">宠物档案管理</h2>
          <p className="text-neutral-500 mt-1">管理所有用户的宠物健康档案</p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="搜索宠物名称、品种或主人..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-200">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">宠物</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">品种</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">年龄/体重</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">主人</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">疫苗</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">过敏史</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-neutral-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredPets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                  <PawPrint size={48} className="mx-auto mb-3 opacity-50" />
                  <p>暂无宠物档案</p>
                </td>
              </tr>
            ) : (
              filteredPets.map((pet) => (
                <tr key={pet.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                        <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800">{pet.name}</p>
                        <p className="text-xs text-neutral-500">ID: {pet.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">{pet.breed}</td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    <span className="badge badge-neutral mr-2">{pet.age}岁</span>
                    <span className="badge badge-neutral">{pet.weight}kg</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                        <User size={14} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-700">{pet.ownerName}</p>
                        <p className="text-xs text-neutral-500">{pet.ownerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        pet.vaccines.length > 0 ? 'bg-secondary-100' : 'bg-neutral-100'
                      )}>
                        <Syringe size={14} className={pet.vaccines.length > 0 ? 'text-secondary-600' : 'text-neutral-400'} />
                      </div>
                      <span className="text-sm text-neutral-700">{pet.vaccines.length} 条</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {pet.allergies.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle size={14} className="text-red-600" />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {pet.allergies.slice(0, 2).map((a, i) => (
                            <span key={i} className="badge badge-danger text-[10px]">{a}</span>
                          ))}
                          {pet.allergies.length > 2 && (
                            <span className="text-xs text-neutral-500">+{pet.allergies.length - 2}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">无</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(pet.id, pet.name)}
                        disabled={deleting === pet.id}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="删除"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-neutral-500">
        共 {filteredPets.length} 条记录
      </div>
    </div>
  );
}
