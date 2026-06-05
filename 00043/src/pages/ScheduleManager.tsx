import { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Calendar,
  Clock,
  User,
  Star,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import type { ScheduleItem as Schedule } from '../types';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function ScheduleManager() {
  const { caregivers, schedules, bookings, addSchedule, updateSchedule, deleteSchedule } = useAppStore();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Schedule>>({
    caregiverId: '',
    date: '',
    shift: 'morning',
  });
  const [saving, setSaving] = useState(false);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    });
  }, [currentWeekStart]);

  const goToPrevWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const goToNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getShiftLabel = (shift: string) => {
    const labels: Record<string, string> = {
      morning: '早班 (08:00-16:00)',
      afternoon: '中班 (12:00-20:00)',
      evening: '晚班 (16:00-24:00)',
    };
    return labels[shift] || shift;
  };

  const getShiftColor = (shift: string) => {
    const colors: Record<string, string> = {
      morning: 'bg-blue-100 text-blue-700',
      afternoon: 'bg-amber-100 text-amber-700',
      evening: 'bg-purple-100 text-purple-700',
    };
    return colors[shift] || 'bg-neutral-100 text-neutral-700';
  };

  const getSchedulesForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(s => s.date === dateStr);
  };

  const getBookingsForCaregiverOnDate = (caregiverId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b =>
      b.caregiverId === caregiverId &&
      b.status === 'in_progress' &&
      dateStr >= b.startDate &&
      dateStr <= b.endDate
    ).length;
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingId(schedule.id);
    setFormData({ ...schedule });
    setShowForm(true);
  };

  const handleAddNew = (date?: string, caregiverId?: string) => {
    setEditingId(null);
    setFormData({
      caregiverId: caregiverId || '',
      date: date || format(new Date(), 'yyyy-MM-dd'),
      shift: 'morning',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.caregiverId || !formData.date) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateSchedule(editingId, formData);
      } else {
        await addSchedule(formData as Omit<Schedule, 'id'>);
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条排班记录吗？')) return;
    try {
      await deleteSchedule(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">护理员排班</h2>
          <p className="text-neutral-500 mt-1">管理护理员的工作时间和班次安排</p>
        </div>
        <button onClick={() => handleAddNew()} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          新增排班
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevWeek}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              今天
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <h3 className="text-lg font-semibold text-neutral-800 ml-2">
              {format(weekDays[0], 'M月d日', { locale: zhCN })} - {format(weekDays[6], 'M月d日', { locale: zhCN })}
            </h3>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-neutral-600">早班</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-neutral-600">中班</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400" />
              <span className="text-neutral-600">晚班</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left bg-neutral-50 border border-neutral-200 min-w-[180px]">
                  护理员
                </th>
                {weekDays.map((day, idx) => {
                  const isToday = isSameDay(day, new Date());
                  const daySchedules = getSchedulesForDay(day);
                  return (
                    <th
                      key={idx}
                      className={cn(
                        'p-3 text-center border border-neutral-200 min-w-[120px]',
                        isToday ? 'bg-primary-50' : 'bg-neutral-50'
                      )}
                    >
                      <p className={cn(
                        'text-sm font-medium',
                        isToday ? 'text-primary-700' : 'text-neutral-700'
                      )}>
                        {format(day, 'EEE', { locale: zhCN })}
                      </p>
                      <p className={cn(
                        'text-lg font-bold',
                        isToday ? 'text-primary-600' : 'text-neutral-800'
                      )}>
                        {format(day, 'd')}
                      </p>
                      {daySchedules.length > 0 && (
                        <p className="text-xs text-neutral-500">
                          {daySchedules.length}人排班
                        </p>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {caregivers.map((caregiver) => (
                <tr key={caregiver.id} className="hover:bg-neutral-50/50">
                  <td className="p-3 border border-neutral-200">
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
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs text-neutral-500">{caregiver.rating}</span>
                          <span className="text-xs text-neutral-400 ml-2">
                            {Math.round(caregiver.recommendationWeight * 100)}%权重
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  {weekDays.map((day, dayIdx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const caregiverSchedules = schedules.filter(
                      s => s.caregiverId === caregiver.id && s.date === dateStr
                    );
                    const bookingCount = getBookingsForCaregiverOnDate(caregiver.id, day);

                    return (
                      <td
                        key={dayIdx}
                        className="p-2 border border-neutral-200 align-top"
                      >
                        <div className="space-y-1">
                          {caregiverSchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className={cn(
                                'text-xs p-2 rounded-lg relative group',
                                getShiftColor(schedule.shift),
                              )}>
                              <div className="flex items-center justify-between">
                                <span>{getShiftLabel(schedule.shift).split(' ')[0]}</span>
                                {bookingCount > 0 && (
                                  <span className="bg-white/50 px-1.5 py-0.5 rounded text-[10px]">
                                    {bookingCount}单
                                  </span>
                                )}
                              </div>
                              <div className="absolute right-1 top-1 hidden group-hover:flex gap-1">
                                <button
                                  onClick={() => handleEdit(schedule)}
                                  className="p-1 bg-white rounded shadow hover:bg-neutral-100"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(schedule.id)}
                                  className="p-1 bg-white rounded shadow hover:bg-red-50 text-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            onClick={() => handleAddNew(dateStr, caregiver.id)}
                            className="w-full text-xs py-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            + 添加
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">排班列表</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">护理员</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">日期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">班次</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">状态</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {schedules
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((schedule) => {
                  const caregiver = caregivers.find(c => c.id === schedule.caregiverId);
                  return (
                    <tr key={schedule.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img src={caregiver?.avatar} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="font-medium text-neutral-800">{caregiver?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-700">{schedule.date}</td>
                      <td className="py-3 px-4">
                        <span className={cn('text-xs px-2 py-1 rounded-lg', getShiftColor(schedule.shift))}>
                          {getShiftLabel(schedule.shift)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle size={14} />
                          排班
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-slide-in-top">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-800">
                {editingId ? '编辑排班' : '新增排班'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  护理员 *
                </label>
                <select
                  value={formData.caregiverId}
                  onChange={(e) => setFormData({ ...formData, caregiverId: e.target.value })}
                  className="input-field"
                >
                  <option value="">请选择护理员</option>
                  {caregivers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  日期 *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  班次
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value as Schedule['shift'] })}
                  className="input-field"
                >
                  <option value="morning">早班 (08:00-16:00)</option>
                  <option value="afternoon">中班 (12:00-20:00)</option>
                  <option value="evening">晚班 (16:00-24:00)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.caregiverId || !formData.date || saving}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <><Save size={18} /> 保存</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
