import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, ArrowRight, X, Upload } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import StarRating from '@/components/StarRating';

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { submitReview, fetchOrder, uploadPhotos } = useAppStore();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{ staffId: string; serviceTypeName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      fetchOrder(id).then((order) => {
        setOrderInfo({ staffId: order.staffId || '', serviceTypeName: order.serviceTypeName || '' });
      }).catch(() => {});
    }
  }, [id]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 4 - photoUrls.length;
    if (remaining <= 0) return;

    const selectedFiles = Array.from(files).slice(0, remaining);

    const previews = selectedFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews((prev) => [...prev, ...previews]);

    setUploading(true);
    try {
      const urls = await uploadPhotos(selectedFiles);
      setPhotoUrls((prev) => [...prev, ...urls]);
    } catch {
      setPhotoPreviews((prev) => prev.slice(0, prev.length - selectedFiles.length));
    } finally {
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoRemove = (index: number) => {
    if (photoPreviews[index] && !photoPreviews[index].startsWith('/api/')) {
      URL.revokeObjectURL(photoPreviews[index]);
    }
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!id || rating === 0 || !orderInfo?.staffId) return;
    setSubmitting(true);
    try {
      await submitReview({
        orderId: id,
        userId: 'user-001',
        staffId: orderInfo.staffId,
        rating,
        comment,
        photos: photoUrls,
      } as any);
      setSubmitted(true);
    } catch {
      alert('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--success)' }}>
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>评价提交成功</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>感谢您的反馈，我们会持续提升服务质量</p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 mx-auto px-6 py-2.5 rounded-lg text-white font-medium text-sm"
            style={{ background: 'var(--primary)' }}
          >
            返回首页 <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--secondary)' }}>服务评价</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>订单信息</h3>
        <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p>订单号: <span className="font-mono">{id}</span></p>
          {orderInfo && <p>服务类型: {orderInfo.serviceTypeName}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>服务评分</h3>
        <StarRating value={rating} onChange={setRating} size={32} />
        {rating === 0 && <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>请点击星星评分</p>}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>文字评价</h3>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="分享您的服务体验..."
          rows={4}
          className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
          style={{ borderColor: '#E2E8F0' }}
        />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>
          现场照片（最多4张）
          {uploading && <span className="text-xs ml-2 font-normal" style={{ color: 'var(--primary)' }}>上传中...</span>}
        </h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="grid grid-cols-4 gap-3">
          {photoPreviews.map((preview, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border">
              <img
                src={preview}
                alt={`photo-${idx}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handlePhotoRemove(idx)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X size={10} />
              </button>
              {idx >= photoUrls.length && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <Upload size={16} className="animate-pulse" style={{ color: 'var(--primary)' }} />
                </div>
              )}
            </div>
          ))}
          {photoPreviews.length < 4 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: '#E2E8F0', color: 'var(--text-secondary)' }}
            >
              <Camera size={20} />
              <span className="text-xs">添加</span>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting || uploading}
        className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-40 transition-opacity"
        style={{ background: 'var(--primary)' }}
      >
        {submitting ? '提交中...' : '提交评价'}
      </button>
    </div>
  );
}
