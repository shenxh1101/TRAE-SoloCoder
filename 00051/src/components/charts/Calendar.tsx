import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  format,
  isToday,
  isWithinInterval,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarEvent } from '@/types';
import { cn } from '@/lib/utils';

interface CalendarProps {
  events: CalendarEvent[];
  onDateClick?: (date: Date, events: CalendarEvent[]) => void;
}

const Calendar = ({ events, onDateClick }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter((event) =>
      isWithinInterval(day, { start: new Date(event.start), end: new Date(event.end) })
    );
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">
          {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold text-slate-500 bg-slate-50"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const dayIsToday = isToday(day);

          return (
            <div
              key={index}
              onClick={() => onDateClick?.(day, dayEvents)}
              className={cn(
                'min-h-24 p-2 border-b border-r border-slate-100 cursor-pointer transition-colors',
                'hover:bg-blue-50',
                !isCurrentMonth && 'bg-slate-50',
                dayIsToday && 'bg-blue-50'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  isCurrentMonth ? 'text-slate-800' : 'text-slate-400',
                  dayIsToday && 'text-blue-600 font-bold'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'text-xs px-2 py-1 rounded truncate',
                      event.type === 'booking'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    )}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-slate-500 px-2">
                    +{dayEvents.length - 2} 更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
