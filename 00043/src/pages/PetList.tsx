import { Link } from 'react-router-dom';
import {
  Plus,
  PawPrint,
  Edit2,
  Trash2,
  Syringe,
  AlertTriangle,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function PetList() {
  const { pets, deletePet } = useAppStore();

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`确定要删除宠物档案"${name}"吗？`)) {
      await deletePet(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">宠物档案</h2>
          <p className="text-neutral-500 mt-1">管理您的宠物健康档案和疫苗记录</p>
        </div>
        <Link
          to="/pets/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          新增宠物
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PawPrint size={40} className="text-neutral-300" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">暂无宠物档案</h3>
          <p className="text-neutral-500 mb-6">添加您的第一个宠物档案，开始享受寄养服务</p>
          <Link
            to="/pets/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} />
            添加宠物
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet, index) => {
            const nextVaccine = pet.vaccines
              .map(v => ({ ...v, nextDate: new Date(v.nextDate || v.date) }))
              .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())[0];

            const isVaccineSoon = nextVaccine && 
              nextVaccine.nextDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={pet.id}
                className="card card-hover group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-neutral-100">
                    <img
                      src={pet.avatar}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-800">{pet.name}</h3>
                        <p className="text-sm text-neutral-500">{pet.breed}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/pets/${pet.id}/edit`}
                          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} className="text-neutral-500" />
                        </Link>
                        <button
                          onClick={() => handleDelete(pet.id, pet.name)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="badge badge-neutral">{pet.age} 岁</span>
                      <span className="badge badge-neutral">{pet.weight} kg</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      isVaccineSoon ? 'bg-warning-100' : 'bg-secondary-100'
                    )}>
                      <Syringe
                        size={16}
                        className={isVaccineSoon ? 'text-warning-600' : 'text-secondary-600'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-700">
                        {nextVaccine ? nextVaccine.name : '暂无疫苗记录'}
                      </p>
                      {nextVaccine && (
                        <p className={cn(
                          'text-xs flex items-center gap-1',
                          isVaccineSoon ? 'text-warning-600' : 'text-neutral-500'
                        )}>
                          <Calendar size={12} />
                          下次接种: {format(nextVaccine.nextDate, 'yyyy-MM-dd')}
                          {isVaccineSoon && ' (即将到期)'}
                        </p>
                      )}
                    </div>
                  </div>

                  {pet.allergies.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle size={16} className="text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-700">过敏史</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pet.allergies.map((allergy, i) => (
                            <span key={i} className="badge badge-danger text-[10px]">
                              {allergy}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Calendar size={16} className="text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-700">档案创建</p>
                      <p className="text-xs text-neutral-500">
                        {format(new Date(pet.createdAt), 'yyyy年MM月dd日', { locale: zhCN })}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  to="/booking"
                  state={{ selectedPetId: pet.id }}
                  className="w-full mt-4 py-2.5 bg-neutral-50 hover:bg-primary-50 text-neutral-600 hover:text-primary-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors group/link"
                >
                  预约寄养
                  <ChevronRight size={16} className="group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
