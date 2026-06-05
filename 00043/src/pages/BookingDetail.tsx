import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Video,
  MessageSquare,
  Send,
  AlertTriangle,
  Star,
  Calendar,
  Clock,
  User,
  Home,
  PawPrint,
  Upload,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { useAppStore } from '../store';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    bookings,
    pets,
    rooms,
    caregivers,
    packages,
    currentUser,
    addBookingUpdate,
    addMessage,
    reminders,
  } = useAppStore();

  const [newMessage, setNewMessage] = useState('');
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'photo' | 'video'>('photo');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const booking = bookings.find(b => b.id === id);
  const bookingId = booking?.id || id;
  const pet = pets.find(p => p.id === booking?.petId);
  const room = rooms.find(r => r.id === booking?.roomId);
  const caregiver = caregivers.find(c => c.id === booking?.caregiverId);
  const pkg = packages.find(p => p.id === booking?.packageId);

  const isCaregiver = currentUser?.role === 'caregiver';
  const isAdmin = currentUser?.role === 'admin';

  const hoursSinceLastUpdate = booking?.updates && booking.updates.length > 0
    ? differenceInHours(new Date(), new Date(booking.updates[booking.updates.length - 1].timestamp || booking.updates[booking.updates.length - 1].createdAt))
    : booking?.startDate
      ? differenceInHours(new Date(), new Date(booking.startDate))
      : 0;

  const needsReminder = hoursSinceLastUpdate >= 24 &&
    (booking?.status === 'in_progress' || booking?.status === 'in-progress');

  const canUpload = isCaregiver &&
    (booking?.status === 'in_progress' || booking?.status === 'in-progress');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [booking?.messages]);

  if (!booking || !pet || !room || !caregiver || !pkg) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <Loader2 size={48} className="mx-auto mb-4 animate-spin text-primary-500" />
        <p className="text-neutral-500">加载中...</p>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    try {
      await addMessage(bookingId, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('type', uploadType);
      formData.append('content', uploadContent.trim());
      formData.append('note', uploadNote.trim());

      if (uploadFiles && uploadFiles.length > 0) {
        Array.from(uploadFiles).forEach((file: File) => {
          formData.append('media', file);
        });
      }

      await addBookingUpdate(bookingId, formData);

      setShowUploadModal(false);
      setUploadContent('');
      setUploadNote('');
      setUploadFiles(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: '待确认', className: 'badge-warning' },
      confirmed: { label: '已确认', className: 'badge-info' },
      in_progress: { label: '进行中', className: 'badge-secondary' },
      completed: { label: '已完成', className: 'badge-success' },
      cancelled: { label: '已取消', className: 'badge-danger' },
    };
    const badge = badges[status] || { label: status, className: 'badge-default' };
    return <span className={cn('badge', badge.className)}>{badge.label}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-neutral-800">寄养详情</h2>
            {getStatusBadge(booking.status)}
            {booking.reviewId && (
              <span className="badge badge-success">已评价</span>
            )}
          </div>
          <p className="text-neutral-500 mt-1">订单号: {booking.id}</p>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={18} />
            上传记录
          </button>
        )}
        {booking.status === 'completed' && !booking.reviewId && (
          <button
            onClick={() => setShowReview(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Star size={18} />
            去评价
          </button>
        )}
      </div>

      {needsReminder && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
          <AlertTriangle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">更新提醒</p>
            <p className="text-sm text-red-600">
              已超过 {hoursSinceLastUpdate} 小时未更新宠物状态，请及时上传最新照片或视频。
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-neutral-800">{pet.name}</h3>
                  <span className="text-sm text-neutral-500">{pet.breed}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-400">年龄</p>
                    <p className="font-medium text-neutral-700">{pet.age}岁</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">体重</p>
                    <p className="font-medium text-neutral-700">{pet.weight}kg</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">性别</p>
                    <p className="font-medium text-neutral-700">{pet.gender === 'male' ? '公' : '母'}</p>
                  </div>
                </div>
                {pet.allergies.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-neutral-400 mb-1">过敏史</p>
                    <div className="flex flex-wrap gap-1">
                      {pet.allergies.map((a, i) => (
                        <span key={i} className="badge badge-danger text-[10px]">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <Calendar size={20} className="text-primary-500 mb-2" />
              <p className="text-xs text-neutral-400">入住日期</p>
              <p className="font-semibold text-neutral-800">{booking.startDate}</p>
            </div>
            <div className="card p-4">
              <Calendar size={20} className="text-secondary-500 mb-2" />
              <p className="text-xs text-neutral-400">退房日期</p>
              <p className="font-semibold text-neutral-800">{booking.endDate}</p>
            </div>
            <div className="card p-4">
              <Home size={20} className="text-amber-500 mb-2" />
              <p className="text-xs text-neutral-400">房间</p>
              <p className="font-semibold text-neutral-800">{room.name}</p>
            </div>
            <div className="card p-4">
              <PawPrint size={20} className="text-rose-500 mb-2" />
              <p className="text-xs text-neutral-400">套餐</p>
              <p className="font-semibold text-neutral-800">{pkg.name}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Camera size={20} className="text-primary-500" />
              护理日志
            </h3>

            {booking.updates.length === 0 ? (
              <div className="text-center py-12 text-neutral-400">
                <ImageIcon size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无护理记录</p>
                {canUpload && (
                  <p className="text-sm mt-1">点击右上角上传最新状态</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {booking.updates.slice().reverse().map((update, index) => (
                  <div
                    key={update.id}
                    className="border border-neutral-200 rounded-xl overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                      onClick={() => setExpandedUpdate(expandedUpdate === update.id ? null : update.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img
                              src={caregiver.avatar}
                              alt={caregiver.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-800">{caregiver.name}</p>
                            <p className="text-xs text-neutral-400">
                              {formatDistanceToNow(new Date(update.timestamp), { locale: zhCN, addSuffix: true })}
                              {' · '}
                              {update.type === 'photo' ? '照片' : '视频'}
                              {update.mediaUrls?.length && ` · ${update.mediaUrls.length}张`}
                            </p>
                          </div>
                        </div>
                        {expandedUpdate === update.id ? (
                          <ChevronUp size={20} className="text-neutral-400" />
                        ) : (
                          <ChevronDown size={20} className="text-neutral-400" />
                        )}
                      </div>

                      {(() => {
                        const images = update.mediaUrls && update.mediaUrls.length > 0
                          ? update.mediaUrls
                          : update.content ? [update.content] : [];

                        if (images.length > 0) {
                          return (
                            <div className="flex gap-2 mt-3">
                              {images.slice(0, 3).map((url, i) => (
                                <div key={i} className="w-20 h-20 rounded-lg overflow-hidden">
                                  <img src={url} alt="护理记录" className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {images.length > 3 && (
                                <div className="w-20 h-20 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 font-medium">
                                  +{images.length - 3}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {update.videoUrl && (
                        <div className="mt-3 w-full aspect-video bg-neutral-100 rounded-lg flex items-center justify-center">
                          <Video size={48} className="text-neutral-400" />
                        </div>
                      )}
                    </div>

                    {expandedUpdate === update.id && (
                      <div className="p-4 bg-neutral-50 border-t border-neutral-200">
                        {(update.notes || update.note) && (
                          <p className="text-sm text-neutral-600 leading-relaxed">
                            {update.notes || update.note}
                          </p>
                        )}
                        <div className="mt-3 pt-3 border-t border-neutral-200">
                          <p className="text-xs text-neutral-400">
                            更新时间: {format(new Date(update.timestamp || update.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-primary-500" />
              留言互动
            </h3>

            <div className="h-64 overflow-y-auto space-y-4 mb-4 pr-2">
              {booking.messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-400">
                  <p>暂无留言，开始沟通吧</p>
                </div>
              ) : (
                booking.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.senderId === currentUser?.id ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {msg.senderRole === 'caregiver' ? (
                        <img src={caregiver.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} className="text-neutral-500" />
                      )}
                    </div>
                    <div className={cn(
                      'max-w-[75%]',
                      msg.senderId === currentUser?.id ? 'text-right' : ''
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-neutral-700">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {format(new Date(msg.timestamp || msg.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <div className={cn(
                        'px-4 py-2 rounded-2xl text-sm',
                        msg.senderId === currentUser?.id
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : 'bg-neutral-100 text-neutral-800 rounded-bl-sm'
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="输入留言内容..."
                className="flex-1 input-field"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="btn-primary p-3"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-primary-500" />
              专属护理员
            </h3>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 ring-4 ring-secondary-100">
                <img src={caregiver.avatar} alt={caregiver.name} className="w-full h-full object-cover" />
              </div>
              <h4 className="font-semibold text-neutral-800">{caregiver.name}</h4>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="font-medium text-neutral-700">{caregiver.rating}</span>
                <span className="text-xs text-neutral-400">({caregiver.reviewCount}评价)</span>
              </div>
              <p className="text-sm text-neutral-500 mt-1">{caregiver.experienceYears}年经验</p>
              <div className="flex flex-wrap gap-1 justify-center mt-3">
                {caregiver.specialties.map((s, i) => (
                  <span key={i} className="badge badge-secondary text-[10px]">{s}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">费用明细</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">套餐费用</span>
                <span className="text-neutral-800">¥{pkg.pricePerDay} × {api.calculatePrice(pkg.pricePerDay, booking.startDate, booking.endDate).days}天</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">服务费</span>
                <span className="text-neutral-800">¥0</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200">
                <span className="font-medium text-neutral-800">总计</span>
                <span className="font-bold text-xl text-primary-500">¥{booking.totalPrice}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">已付定金</span>
                <span className="text-neutral-600">¥{booking.deposit}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">待付尾款</span>
                <span className="text-neutral-600">¥{booking.totalPrice - booking.deposit}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-slide-in-top">
            <h3 className="text-xl font-bold text-neutral-800 mb-4">上传护理记录</h3>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUploadType('photo')}
                className={cn(
                  'flex-1 py-2 px-4 rounded-xl font-medium transition-all',
                  uploadType === 'photo'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                )}
              >
                <Camera size={18} className="inline mr-2" />
                照片
              </button>
              <button
                onClick={() => setUploadType('video')}
                className={cn(
                  'flex-1 py-2 px-4 rounded-xl font-medium transition-all',
                  uploadType === 'video'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                )}
              >
                <Video size={18} className="inline mr-2" />
                视频
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                上传{uploadType === 'photo' ? '图片' : '视频'} *
              </label>
              <input
                type="file"
                accept={uploadType === 'photo' ? 'image/*' : 'video/*'}
                multiple
                onChange={(e) => setUploadFiles(e.target.files)}
                className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {uploadFiles && uploadFiles.length > 0 && (
                <p className="text-xs text-neutral-500 mt-2">
                  已选择 {uploadFiles.length} 个文件
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                备注说明
              </label>
              <textarea
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                placeholder="记录宠物今日状态，如饮食、活动、心情等..."
                rows={3}
                className="input-field resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={(!uploadFiles || uploadFiles.length === 0) || uploading}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <><Upload size={18} /> 上传</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-slide-in-top">
            <h3 className="text-xl font-bold text-neutral-800 mb-4">评价护理员</h3>
            <ReviewForm
              bookingId={booking.id}
              caregiverId={caregiver.id}
              petName={pet.name}
              onClose={() => setShowReview(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewForm({
  bookingId,
  caregiverId,
  petName,
  onClose,
}: {
  bookingId: string;
  caregiverId: string;
  petName: string;
  onClose: () => void;
}) {
  const { addReview, updateCaregiverWeight } = useAppStore();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await addReview(bookingId, {
        rating,
        content,
      });

      onClose();
      navigate(`/booking/${bookingId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <p className="text-neutral-500 mb-3">
          {petName} 的寄养服务已完成，请对护理员进行评价
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={36}
                className={cn(
                  'transition-colors',
                  (hoverRating || rating) >= star
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-neutral-300'
                )}
              />
            </button>
          ))}
        </div>
        <p className="text-sm text-neutral-600 mt-2">
          {rating === 5 && '非常满意'}
          {rating === 4 && '满意'}
          {rating === 3 && '一般'}
          {rating === 2 && '不满意'}
          {rating === 1 && '非常不满意'}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          评价内容
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享您的寄养体验，帮助其他宠物主人选择合适的护理员..."
          rows={4}
          className="input-field resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 btn-secondary">
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || content.length < 5}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>提交评价</>
          )}
        </button>
      </div>
    </div>
  );
}
