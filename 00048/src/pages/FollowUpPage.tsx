import { useEffect, useState } from 'react';
import { CalendarCheck, Camera, Upload } from 'lucide-react';
import useFollowupStore from '@/stores/followupStore';

const ANIMAL_IMG = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20adopted%20cat%20or%20dog%20happy&image_size=square';

export default function FollowUpPage() {
  const { followUps, fetchFollowUps, submitFollowUp } = useFollowupStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const displayFollowUps = followUps.length > 0 ? followUps : [
    { id: '1', agreementId: '1', month: 1 as const, dueDate: '2024-04-15', status: 'pending' as const, photos: [], notes: '', animalName: '小橘', animalPhoto: '' },
    { id: '2', agreementId: '1', month: 3 as const, dueDate: '2024-06-15', status: 'pending' as const, photos: [], notes: '', animalName: '小橘', animalPhoto: '' },
    { id: '3', agreementId: '2', month: 1 as const, dueDate: '2024-04-20', status: 'completed' as const, photos: ['photo1.jpg'], notes: '一切正常，小橘很健康', completedAt: '2024-04-18', animalName: '大黄', animalPhoto: '' },
    { id: '4', agreementId: '2', month: 3 as const, dueDate: '2024-06-20', status: 'overdue' as const, photos: [], notes: '', animalName: '大黄', animalPhoto: '' },
    { id: '5', agreementId: '3', month: 1 as const, dueDate: '2024-05-01', status: 'completed' as const, photos: ['photo2.jpg', 'photo3.jpg'], notes: '花花适应得很好，体重增加了', completedAt: '2024-04-28', animalName: '花花', animalPhoto: '' },
  ];

  const pending = displayFollowUps.filter((f) => f.status === 'pending' || f.status === 'overdue');
  const completed = displayFollowUps.filter((f) => f.status === 'completed');
  const currentList = activeTab === 'pending' ? pending : completed;

  const handleSubmit = async (id: string) => {
    await submitFollowUp(id, { photos, notes: notes || undefined });
    setPhotos([]);
    setNotes('');
    setSubmittingId(null);
  };

  const handlePhotoUpload = () => {
    setPhotos((prev) => [...prev, `photo_${Date.now()}.jpg`]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarCheck className="text-primary-500" size={28} />
        <h1 className="section-title">回访管理</h1>
      </div>

      <div className="flex rounded-xl overflow-hidden border border-warm-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 text-center font-medium transition-all ${
            activeTab === 'pending' ? 'bg-primary-500 text-white' : 'bg-white text-warm-600 hover:bg-warm-50'
          }`}
        >
          待回访 ({pending.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 text-center font-medium transition-all ${
            activeTab === 'completed' ? 'bg-primary-500 text-white' : 'bg-white text-warm-600 hover:bg-warm-50'
          }`}
        >
          已完成 ({completed.length})
        </button>
      </div>

      <div className="space-y-4">
        {currentList.map((fu) => (
          <div key={fu.id} className="card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <img src={fu.animalPhoto || ANIMAL_IMG} alt={fu.animalName} className="w-12 h-12 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-warm-800">{fu.animalName}</h3>
                  <span className={`badge ${fu.status === 'overdue' ? 'badge-urgent' : fu.status === 'completed' ? 'badge-success' : 'badge-pending'}`}>
                    {fu.status === 'overdue' ? '已逾期' : fu.status === 'completed' ? '已完成' : '待回访'}
                  </span>
                </div>
                <div className="text-sm text-warm-500">
                  第{fu.month}个月回访 · 截止 {fu.dueDate}
                </div>
              </div>
            </div>

            {(fu.status === 'pending' || fu.status === 'overdue') && (
              <div className="space-y-3 border-t border-warm-100 pt-3">
                {submittingId === fu.id ? (
                  <>
                    <div>
                      <label className="label-field">上传照片</label>
                      <div className="flex flex-wrap gap-2">
                        {photos.map((p, i) => (
                          <div key={i} className="w-16 h-16 rounded-lg bg-primary-50 flex items-center justify-center text-xs text-primary-500">
                            照片{i + 1}
                          </div>
                        ))}
                        <button
                          onClick={handlePhotoUpload}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-warm-300 flex flex-col items-center justify-center text-warm-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
                        >
                          <Upload size={16} />
                          <span className="text-[10px]">上传</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label-field">回访备注</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="input-field resize-none text-sm"
                        placeholder="描述动物当前状况..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setSubmittingId(null)} className="btn-secondary flex-1 text-sm">
                        取消
                      </button>
                      <button onClick={() => handleSubmit(fu.id)} className="btn-primary flex-1 text-sm">
                        提交回访
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setSubmittingId(fu.id)}
                    className="btn-outline w-full text-sm flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    提交回访
                  </button>
                )}
              </div>
            )}

            {fu.status === 'completed' && (
              <div className="border-t border-warm-100 pt-3 space-y-2">
                {fu.photos.length > 0 && (
                  <div className="flex gap-2">
                    {fu.photos.map((p, i) => (
                      <div key={i} className="w-16 h-16 rounded-lg bg-success-50 flex items-center justify-center text-xs text-success-500">
                        照片{i + 1}
                      </div>
                    ))}
                  </div>
                )}
                {fu.notes && <p className="text-sm text-warm-600">{fu.notes}</p>}
                {fu.completedAt && <p className="text-xs text-warm-400">完成于 {fu.completedAt}</p>}
              </div>
            )}
          </div>
        ))}

        {currentList.length === 0 && (
          <div className="card p-8 text-center text-warm-400">
            {activeTab === 'pending' ? '暂无待回访记录' : '暂无已完成回访'}
          </div>
        )}
      </div>
    </div>
  );
}
