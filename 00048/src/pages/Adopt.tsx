import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import useAdoptStore from '@/stores/adoptStore';

const ANIMAL_IMG = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20adoptable%20cat%20or%20dog%20warm%20portrait&image_size=square';

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '猫咪', value: 'cat' },
  { label: '狗狗', value: 'dog' },
];

const genderOptions = [
  { label: '全部', value: 'all' },
  { label: '公', value: 'male' },
  { label: '母', value: 'female' },
];

const ageOptions = [
  { label: '全部', value: 'all' },
  { label: '幼年', value: 'young' },
  { label: '成年', value: 'adult' },
  { label: '老年', value: 'senior' },
];

export default function Adopt() {
  const { availableAnimals, fetchAvailable } = useAdoptStore();
  const [typeFilter, setTypeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');

  useEffect(() => {
    fetchAvailable();
  }, [fetchAvailable]);

  const filtered = availableAnimals.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (genderFilter !== 'all' && a.gender !== genderFilter) return false;
    if (ageFilter !== 'all') {
      const age = a.age || '';
      if (ageFilter === 'young' && !age.includes('幼')) return false;
      if (ageFilter === 'adult' && !age.includes('成')) return false;
      if (ageFilter === 'senior' && !age.includes('老')) return false;
    }
    return true;
  });

  const displayAnimals = filtered.length > 0 ? filtered : [
    { id: '1', name: '小橘', type: 'cat' as const, gender: 'male' as const, age: '2岁', photos: [], personality: ['温顺', '亲人'], status: 'available' as const, rescueTaskId: '', medicalRecords: [], vaccines: [], isNeutered: true, recoveryProgress: 100, createdAt: '' },
    { id: '2', name: '大黄', type: 'dog' as const, gender: 'female' as const, age: '3岁', photos: [], personality: ['活泼', '忠诚'], status: 'available' as const, rescueTaskId: '', medicalRecords: [], vaccines: [], isNeutered: true, recoveryProgress: 100, createdAt: '' },
    { id: '3', name: '花花', type: 'cat' as const, gender: 'female' as const, age: '1岁', photos: [], personality: ['好奇', '可爱'], status: 'available' as const, rescueTaskId: '', medicalRecords: [], vaccines: [], isNeutered: false, recoveryProgress: 100, createdAt: '' },
    { id: '4', name: '旺财', type: 'dog' as const, gender: 'male' as const, age: '4岁', photos: [], personality: ['安静', '乖巧'], status: 'available' as const, rescueTaskId: '', medicalRecords: [], vaccines: [], isNeutered: true, recoveryProgress: 100, createdAt: '' },
    { id: '5', name: '小白', type: 'cat' as const, gender: 'male' as const, age: '6个月', photos: [], personality: ['调皮', '爱玩'], status: 'available' as const, rescueTaskId: '', medicalRecords: [], vaccines: [], isNeutered: false, recoveryProgress: 100, createdAt: '' },
    { id: '6', name: '豆豆', type: 'dog' as const, gender: 'female' as const, age: '2岁', photos: [], personality: ['友善', '聪明'], status: 'available' as const, rescueTaskId: '', medicalRecords: [], vaccines: [], isNeutered: true, recoveryProgress: 100, createdAt: '' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="text-primary-500" size={28} />
          <h1 className="section-title">领养中心</h1>
        </div>
        <Link to="/adopt/questionnaire" className="btn-primary flex items-center gap-2">
          <Heart size={18} />
          智能匹配
        </Link>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="label-field self-center mr-2">类型:</span>
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                typeFilter === opt.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="label-field self-center mr-2">性别:</span>
          {genderOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGenderFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                genderFilter === opt.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="label-field self-center mr-2">年龄:</span>
          {ageOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAgeFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                ageFilter === opt.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayAnimals.map((animal) => (
          <div key={animal.id} className="card group">
            <div className="aspect-square overflow-hidden bg-warm-100">
              <img
                src={animal.photos[0] || ANIMAL_IMG}
                alt={animal.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-warm-800">{animal.name}</h3>
                <span className={`badge ${animal.type === 'cat' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {animal.type === 'cat' ? '猫咪' : animal.type === 'dog' ? '狗狗' : '其他'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-warm-500">
                <span>{animal.gender === 'male' ? '♂ 公' : animal.gender === 'female' ? '♀ 母' : '未知'}</span>
                <span>·</span>
                <span>{animal.age || '未知'}</span>
                {animal.isNeutered && <span className="badge-success">已绝育</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {animal.personality.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              <Link to={`/animal/${animal.id}`} className="btn-outline w-full text-center block text-sm mt-2">
                了解详情
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
