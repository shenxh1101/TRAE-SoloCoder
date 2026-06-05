import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  X,
  CheckCircle,
  AlertCircle,
  XCircle,
  Timer,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useVisitorStore } from '../../store/useVisitorStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatDateTime, getStatusText, getStatusClass, cn } from '../../utils/helpers';
import { recommendForums } from '../../utils/recommendation';
import { PageHeader } from '../../components/ui/PageHeader';
import type { Forum, ForumReservation } from '../../types';

const VISITOR_ID = 'visitor-1';

const industryColors: Record<string, string> = {
  '人工智能': '#3B82F6',
  '新能源': '#10B981',
  '智能制造': '#F59E0B',
  '智慧城市': '#8B5CF6',
  '物联网': '#EC4899',
  '大数据': '#06B6D4',
  '环保科技': '#22C55E',
  '新材料': '#F97316',
};

const getSeatStatus = (available: number, total: number) => {
  const ratio = available / total;
  if (available === 0) return { status: 'full', color: 'bg-danger-500', text: '已满' };
  if (ratio < 0.2) return { status: 'limited', color: 'bg-warning-500', text: '紧张' };
  return { status: 'available', color: 'bg-success-500', text: '充足' };
};

export default function Forums() {
  const { users, currentUser } = useAuthStore();
  const { forums, reservations, reserveForum, cancelReservation, getQueuePosition } = useVisitorStore();
  const { pushForumNotification } = useNotificationStore();
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [myReservations, setMyReservations] = useState<ForumReservation[]>([]);
  const [forumRecs, setForumRecs] = useState<Array<{ id: string; matchScore: number; reason: string }>>([]);

  const visitor = currentUser || users.find(u => u.id === VISITOR_ID);

  useEffect(() => {
    if (visitor) {
      const my = reservations.filter(r => r.visitorId === VISITOR_ID);
      setMyReservations(my);

      const forumList = forums.map(f => ({
        id: f.id,
        title: f.title,
        industry: f.industry,
        availableSeats: f.availableSeats,
        matchScore: 0,
        reason: '',
      }));
      const recs = recommendForums(visitor, forumList);
      setForumRecs(recs);
    }
  }, [visitor, reservations, forums]);

  const handleReserve = (forum: Forum) => {
    if (!visitor) return;

    const existing = reservations.find(
      r => r.visitorId === VISITOR_ID && r.forumId === forum.id && r.status !== 'cancelled'
    );
    if (existing) return;

    const newReservation = reserveForum(VISITOR_ID, forum.id, forum.title);
    setMyReservations(prev => [...prev, newReservation]);

    pushForumNotification(
      VISITOR_ID,
      forum.id,
      newReservation.status === 'confirmed' ? '论坛预约成功' : '进入候补队列',
      newReservation.status === 'confirmed'
        ? `您已成功预约"${forum.title}"，请准时参加。`
        : `您已进入"${forum.title}"的候补队列，当前位置：${newReservation.queuePosition || 'N/A'}。`
    );
  };

  const handleCancel = (reservationId: string, forumTitle: string) => {
    cancelReservation(reservationId);
    setMyReservations(prev => prev.map(r =>
      r.id === reservationId ? { ...r, status: 'cancelled' as const } : r
    ));

    pushForumNotification(
      VISITOR_ID,
      reservationId,
      '预约已取消',
      `您已取消"${forumTitle}"的预约。`
    );
  };

  const getRecReason = (forumId: string) => {
    return forumRecs.find(r => r.id === forumId)?.reason || '';
  };

  const sortedForums = [...forums].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title="论坛预约"
        subtitle="精彩论坛，抢先预约"
        icon={<Calendar className="w-7 h-7" />}
      />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-medium transition-all duration-300",
            activeTab === 'all'
              ? "bg-primary-500 text-white"
              : "bg-white/5 text-dark-200 hover:bg-white/10"
          )}
        >
          全部论坛
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-medium transition-all duration-300",
            activeTab === 'my'
              ? "bg-primary-500 text-white"
              : "bg-white/5 text-dark-200 hover:bg-white/10"
          )}
        >
          我的预约
          {myReservations.filter(r => r.status !== 'cancelled').length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-rose-500/30 text-rose-400 rounded-full text-xs">
              {myReservations.filter(r => r.status !== 'cancelled').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'all' ? (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500/50 via-primary-500/20 to-transparent" />

          <div className="space-y-6">
            {sortedForums.map((forum, index) => {
              const seatStatus = getSeatStatus(forum.availableSeats, forum.totalSeats);
              const existingReservation = reservations.find(
                r => r.visitorId === VISITOR_ID && r.forumId === forum.id && r.status !== 'cancelled'
              );
              const recReason = getRecReason(forum.id);
              const queuePosition = existingReservation?.status === 'waiting'
                ? getQueuePosition(forum.id, VISITOR_ID)
                : null;

              return (
                <motion.div
                  key={forum.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-16"
                >
                  <div className="absolute left-4 w-4 h-4 rounded-full border-4 border-primary-500 bg-dark-900 z-10" />

                  <motion.div
                    whileHover={{ x: 8 }}
                    className="glass-card glass-card-hover p-6 cursor-pointer"
                    onClick={() => setSelectedForum(forum)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{forum.title}</h3>
                          <span
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: `${industryColors[forum.industry]}20`,
                              color: industryColors[forum.industry],
                            }}
                          >
                            {forum.industry}
                          </span>
                        </div>

                        {recReason && (
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-yellow-400">{recReason}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          seatStatus.status === 'available' && "bg-success-500/20 text-success-400",
                          seatStatus.status === 'limited' && "bg-warning-500/20 text-warning-400",
                          seatStatus.status === 'full' && "bg-danger-500/20 text-danger-400",
                        )}>
                          {seatStatus.text}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-dark-300">
                        <Clock className="w-4 h-4" />
                        <span>{formatDateTime(forum.startTime).split(' ')[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-dark-300">
                        <Timer className="w-4 h-4" />
                        <span>{formatDateTime(forum.startTime).split(' ')[1]} - {formatDateTime(forum.endTime).split(' ')[1]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-dark-300">
                        <MapPin className="w-4 h-4" />
                        <span>{forum.hallName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-dark-300">
                        <User className="w-4 h-4" />
                        <span>{forum.speaker}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-dark-300">座位情况</span>
                        <span className="text-xs text-dark-200">
                          剩余 {forum.availableSeats} / {forum.totalSeats} 座
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(forum.availableSeats / forum.totalSeats) * 100}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={cn("h-full rounded-full", seatStatus.color)}
                        />
                      </div>
                    </div>

                    {existingReservation && (
                      <div className="mb-4 flex items-center gap-2">
                        <span className={cn("status-badge", getStatusClass(existingReservation.status))}>
                          {getStatusText(existingReservation.status)}
                        </span>
                        {existingReservation.status === 'waiting' && queuePosition !== null && (
                          <span className="text-xs text-warning-400">
                            候补队列第 {queuePosition} 位
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-dark-400 line-clamp-1 flex-1 mr-4">
                        {forum.description}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedForum(forum);
                          }}
                          className="btn-secondary py-2 px-4 text-sm"
                        >
                          详情
                        </button>
                        {existingReservation ? (
                          existingReservation.status !== 'cancelled' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(existingReservation.id, forum.title);
                              }}
                              className="btn-danger py-2 px-4 text-sm"
                            >
                              取消预约
                            </button>
                          )
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReserve(forum);
                            }}
                            className={cn(
                              "py-2 px-4 text-sm rounded-xl font-medium transition-all duration-300",
                              seatStatus.status === 'full'
                                ? "bg-warning-500/20 text-warning-400 border border-warning-500/30 hover:bg-warning-500/30"
                                : "btn-primary"
                            )}
                          >
                            {seatStatus.status === 'full' ? '进入候补' : '立即预约'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {['confirmed', 'waiting', 'cancelled'].map((status) => {
            const filtered = myReservations.filter(r => r.status === status);
            if (filtered.length === 0) return null;

            return (
              <div key={status}>
                <div className="flex items-center gap-3 mb-4">
                  {status === 'confirmed' && <CheckCircle className="w-5 h-5 text-success-400" />}
                  {status === 'waiting' && <AlertCircle className="w-5 h-5 text-warning-400" />}
                  {status === 'cancelled' && <XCircle className="w-5 h-5 text-danger-400" />}
                  <h3 className="text-lg font-semibold text-white">
                    {status === 'confirmed' ? '已确认' : status === 'waiting' ? '候补中' : '已取消'}
                  </h3>
                  <span className="text-sm text-dark-400">({filtered.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map((reservation) => {
                    const forum = forums.find(f => f.id === reservation.forumId);
                    if (!forum) return null;
                    const queuePosition = reservation.status === 'waiting'
                      ? getQueuePosition(forum.id, VISITOR_ID)
                      : null;

                    return (
                      <motion.div
                        key={reservation.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card glass-card-hover p-5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-white font-medium flex-1">{forum.title}</h4>
                          <span className={cn("status-badge", getStatusClass(reservation.status))}>
                            {getStatusText(reservation.status)}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-dark-300">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDateTime(forum.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-dark-300">
                            <MapPin className="w-4 h-4" />
                            <span>{forum.hallName}</span>
                          </div>
                          {reservation.status === 'waiting' && queuePosition !== null && (
                            <div className="flex items-center gap-2 text-sm text-warning-400">
                              <Timer className="w-4 h-4" />
                              <span>候补队列第 {queuePosition} 位</span>
                            </div>
                          )}
                        </div>

                        {reservation.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(reservation.id, forum.title)}
                            className="w-full btn-danger py-2 text-sm"
                          >
                            取消预约
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {myReservations.length === 0 && (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 text-dark-500 mx-auto mb-4" />
              <p className="text-dark-300">暂无预约记录</p>
              <button
                onClick={() => setActiveTab('all')}
                className="mt-4 text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1 mx-auto"
              >
                去预约论坛 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedForum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedForum(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedForum.title}</h2>
                  <span
                    className="px-3 py-1 text-sm rounded-full"
                    style={{
                      backgroundColor: `${industryColors[selectedForum.industry]}20`,
                      color: industryColors[selectedForum.industry],
                    }}
                  >
                    {selectedForum.industry}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedForum(null)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-dark-300" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-dark-300 text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>举办时间</span>
                    </div>
                    <p className="text-white font-medium">
                      {formatDateTime(selectedForum.startTime)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-dark-300 text-sm mb-1">
                      <Timer className="w-4 h-4" />
                      <span>持续时间</span>
                    </div>
                    <p className="text-white font-medium">
                      {formatDateTime(selectedForum.startTime).split(' ')[1]} - {formatDateTime(selectedForum.endTime).split(' ')[1]}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-dark-300 text-sm mb-1">
                      <MapPin className="w-4 h-4" />
                      <span>举办地点</span>
                    </div>
                    <p className="text-white font-medium">{selectedForum.hallName}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-dark-300 text-sm mb-1">
                      <User className="w-4 h-4" />
                      <span>主讲人</span>
                    </div>
                    <p className="text-white font-medium">{selectedForum.speaker}</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-dark-300 text-sm">
                      <Users className="w-4 h-4" />
                      <span>座位情况</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      剩余 {selectedForum.availableSeats} / {selectedForum.totalSeats} 座
                    </span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(selectedForum.availableSeats / selectedForum.totalSeats) * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn(
                        "h-full rounded-full",
                        getSeatStatus(selectedForum.availableSeats, selectedForum.totalSeats).color
                      )}
                    />
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-white font-medium mb-2">论坛介绍</h4>
                  <p className="text-dark-300 leading-relaxed">{selectedForum.description}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedForum(null)}
                  className="flex-1 btn-secondary"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    handleReserve(selectedForum);
                    setSelectedForum(null);
                  }}
                  className={cn(
                    "flex-1 font-medium rounded-xl transition-all duration-300",
                    selectedForum.availableSeats === 0
                      ? "bg-warning-500/20 text-warning-400 border border-warning-500/30 hover:bg-warning-500/30 py-3"
                      : "btn-primary"
                  )}
                >
                  {selectedForum.availableSeats === 0 ? '进入候补' : '立即预约'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
