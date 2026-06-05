import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Syringe, Pill, Shield, Calendar, MapPin, Activity, Clock, CheckCircle2, XCircle } from 'lucide-react';
import useAnimalStore from '@/stores/animalStore';

const IMG = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cat%20or%20dog%20portrait&image_size=square';

const statusBadge: Record<string, string> = {
  hospitalized: 'badge-active',
  recovering: 'badge-pending',
  recovered: 'badge-success',
  available: 'badge-success',
  adopted: 'badge-info',
};

const statusLabel: Record<string, string> = {
  hospitalized: '治疗中',
  recovering: '恢复中',
  recovered: '已康复',
  available: '可领养',
  adopted: '已领养',
};

const typeLabel: Record<string, string> = {
  dog: '犬',
  cat: '猫',
  other: '其他',
};

const genderLabel: Record<string, string> = {
  male: '公',
  female: '母',
  unknown: '未知',
};

export default function AnimalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAnimal, fetchAnimal, loading } = useAnimalStore();

  useEffect(() => {
    if (id) fetchAnimal(id);
  }, [id, fetchAnimal]);

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6 text-center text-warm-400 py-20">加载中...</div>;
  }

  if (!currentAnimal) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-20">
        <p className="text-warm-400 mb-4">未找到该动物信息</p>
        <button onClick={() => navigate(-1)} className="btn-primary">返回</button>
      </div>
    );
  }

  const animal = currentAnimal;
  const photos = animal.photos.length > 0 ? animal.photos : [`${IMG}&seed=${animal.id}`];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-warm-500 hover:text-primary-500 transition-colors">
        <ArrowLeft className="w-5 h-5" /> 返回
      </button>

      <div className="space-y-3">
        <div className="rounded-2xl overflow-hidden border border-warm-200 aspect-video">
          <img src={photos[0]} alt={animal.name} className="w-full h-full object-cover" />
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((src, i) => (
              <img key={i} src={src} alt="" className="w-16 h-16 rounded-lg object-cover border border-warm-200 shrink-0" />
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-warm-800">{animal.name}</h1>
          <span className={statusBadge[animal.status] || 'badge'}>{statusLabel[animal.status] || animal.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-warm-600">
          <span>类型：{typeLabel[animal.type] || animal.type}</span>
          <span>性别：{genderLabel[animal.gender] || animal.gender}</span>
          {animal.breed && <span>品种：{animal.breed}</span>}
          {animal.age && <span>年龄：{animal.age}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            animal.isNeutered ? 'bg-success-100 text-success-600' : 'bg-warm-100 text-warm-500'
          }`}>
            {animal.isNeutered ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {animal.isNeutered ? '已绝育' : '未绝育'}
          </span>
        </div>
        {animal.personality.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {animal.personality.map((tag) => (
              <span key={tag} className="bg-primary-50 text-primary-600 px-2.5 py-1 rounded-full text-xs font-medium">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-warm-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-500" /> 恢复进度
        </h2>
        <div className="relative h-3 bg-warm-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary-400 to-success-400 transition-all duration-500"
            style={{ width: `${animal.recoveryProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-warm-500">
          <span>{animal.recoveryProgress}%</span>
          {animal.estimatedRecovery && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> 预计恢复：{animal.estimatedRecovery}
            </span>
          )}
        </div>
      </div>

      {animal.medicalRecords.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-warm-800 flex items-center gap-2 mb-4">
            <Syringe className="w-5 h-5 text-primary-500" /> 就医记录
          </h2>
          <div className="relative pl-6 space-y-0">
            {animal.medicalRecords.map((record, i) => (
              <div key={record.id} className="relative pb-6 last:pb-0">
                {i < animal.medicalRecords.length - 1 && (
                  <div className="absolute left-[-18px] top-[14px] w-0.5 h-full bg-primary-200" />
                )}
                <div className="absolute left-[-22px] top-[6px] w-2.5 h-2.5 rounded-full bg-primary-400 border-2 border-primary-100" />
                <div className="bg-warm-50 rounded-xl p-3 space-y-1">
                  <p className="text-sm font-medium text-warm-800">{record.diagnosis}</p>
                  <p className="text-xs text-warm-500 flex items-center gap-1">
                    <Pill className="w-3 h-3" /> {record.treatment}
                  </p>
                  {record.medication && (
                    <p className="text-xs text-warm-400">用药：{record.medication}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-warm-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {record.date}</span>
                    {record.hospitalName && <span>{record.hospitalName}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {animal.vaccines.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-warm-800 flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary-500" /> 疫苗记录
          </h2>
          <div className="space-y-2">
            {animal.vaccines.map((vaccine) => (
              <div key={vaccine.id} className="flex items-center justify-between bg-warm-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-warm-700">{vaccine.name}</p>
                  <p className="text-xs text-warm-400">{vaccine.date}</p>
                </div>
                {vaccine.nextDate && (
                  <span className="text-xs text-primary-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> 下次：{vaccine.nextDate}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {animal.hospitalName && (
        <div className="card p-5">
          <h2 className="font-bold text-warm-800 flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-primary-500" /> 当前医院
          </h2>
          <div className="flex items-start gap-2 text-sm text-warm-600">
            <MapPin className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
            <span>{animal.hospitalName}</span>
          </div>
        </div>
      )}
    </div>
  );
}
