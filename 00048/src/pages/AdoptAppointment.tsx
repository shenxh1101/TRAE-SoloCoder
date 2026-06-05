import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import useAdoptStore from '@/stores/adoptStore';

export default function AdoptAppointment() {
  const navigate = useNavigate();
  const { createAppointment } = useAdoptStore();
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const today = new Date();
  const days: { date: Date; day: number; weekday: string; available: boolean }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      day: d.getDate(),
      weekday: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      available: d.getDay() !== 0,
    });
  }

  const timeSlots = [
    { value: 'morning', label: '上午', time: '9:00 - 12:00', icon: '🌅' },
    { value: 'afternoon', label: '下午', time: '14:00 - 17:00', icon: '☀️' },
    { value: 'evening', label: '晚上', time: '18:00 - 20:00', icon: '🌙' },
  ];

  const handleConfirm = async () => {
    if (selectedDate === null || !selectedSlot) return;
    const dateStr = days[selectedDate].date.toISOString().split('T')[0];
    await createAppointment({ date: dateStr, timeSlot: selectedSlot, notes });
    navigate('/adopt/agreement');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="text-primary-500" size={28} />
        <h1 className="section-title">预约探访</h1>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-warm-800">选择日期</h2>
        <div className="grid grid-cols-7 gap-2">
          {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
            <div key={w} className="text-center text-xs text-warm-400 font-medium py-1">
              {w}
            </div>
          ))}
          {days.map((d, i) => (
            <button
              key={i}
              disabled={!d.available}
              onClick={() => setSelectedDate(i)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all ${
                selectedDate === i
                  ? 'bg-primary-500 text-white shadow-md'
                  : d.available
                  ? 'bg-warm-50 text-warm-700 hover:bg-primary-50'
                  : 'bg-warm-100 text-warm-300 cursor-not-allowed'
              }`}
            >
              <span className="font-medium">{d.day}</span>
              <span className="text-[10px]">{d.weekday}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-warm-800">选择时段</h2>
        <div className="grid grid-cols-3 gap-3">
          {timeSlots.map((slot) => (
            <button
              key={slot.value}
              onClick={() => setSelectedSlot(slot.value)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                selectedSlot === slot.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-warm-200 hover:border-primary-300'
              }`}
            >
              <div className="text-2xl mb-1">{slot.icon}</div>
              <div className="font-medium text-warm-800">{slot.label}</div>
              <div className="text-xs text-warm-500 mt-1">{slot.time}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-warm-800">备注</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input-field resize-none"
          placeholder="如有特殊需求请在此备注..."
        />
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary flex items-center gap-1">
          <ChevronLeft size={18} />
          返回
        </button>
        <button
          onClick={handleConfirm}
          disabled={selectedDate === null || !selectedSlot}
          className="btn-primary flex items-center gap-1 disabled:opacity-40"
        >
          确认预约
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
