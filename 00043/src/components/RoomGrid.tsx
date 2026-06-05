import type { Room } from '../types';
import { cn } from '../lib/utils';

interface RoomGridProps {
  rooms: Room[];
  onRoomClick?: (room: Room) => void;
}

const statusConfig = {
  available: { label: '空闲', color: 'bg-secondary-500', textColor: 'text-secondary-700', bgColor: 'bg-secondary-50' },
  occupied: { label: '已占用', color: 'bg-primary-500', textColor: 'text-primary-700', bgColor: 'bg-primary-50' },
  locked: { label: '已锁定', color: 'bg-warning-500', textColor: 'text-warning-700', bgColor: 'bg-warning-50' },
  maintenance: { label: '维护中', color: 'bg-neutral-400', textColor: 'text-neutral-600', bgColor: 'bg-neutral-100' },
};

const typeConfig = {
  standard: { label: '标准型', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  luxury: { label: '豪华型', color: 'text-amber-600', bgColor: 'bg-amber-50' },
};

export default function RoomGrid({ rooms, onRoomClick }: RoomGridProps) {
  const economyRooms = rooms.filter(r => r.type === 'standard');
  const luxuryRooms = rooms.filter(r => r.type === 'luxury');

  const renderRoom = (room: Room) => {
    const status = statusConfig[room.status];
    const type = typeConfig[room.type];

    return (
      <div
        key={room.id}
        onClick={() => onRoomClick?.(room)}
        className={cn(
          'relative bg-white rounded-xl border-2 p-3 cursor-pointer transition-all duration-300',
          'hover:shadow-lg hover:-translate-y-0.5',
          room.status === 'available' && 'border-secondary-200 hover:border-secondary-400',
          room.status === 'occupied' && 'border-primary-200 hover:border-primary-400',
          room.status === 'locked' && 'border-warning-200 hover:border-warning-400',
          room.status === 'maintenance' && 'border-neutral-200 hover:border-neutral-400',
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="font-semibold text-neutral-800">{room.name}</span>
          <div className={cn('w-2.5 h-2.5 rounded-full', status.color, room.status === 'occupied' && 'animate-pulse')} />
        </div>

        <div className="text-xs text-neutral-500 mb-2">{room.features?.slice(0, 2).join(' · ') || '标准配置'}</div>

        <div className="flex flex-wrap gap-1">
          <span className={cn('badge text-[10px]', type.bgColor, type.color)}>
            {type.label}
          </span>
          <span className={cn('badge text-[10px]', status.bgColor, status.textColor)}>
            {status.label}
          </span>
        </div>

        {room.status === 'occupied' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white pulse-ring" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <h3 className="font-semibold text-neutral-700">标准型房间</h3>
          <span className="text-sm text-neutral-400">
            ({economyRooms.filter(r => r.status === 'available').length}/{economyRooms.length} 空闲)
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {economyRooms.map(renderRoom)}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <h3 className="font-semibold text-neutral-700">豪华型房间</h3>
          <span className="text-sm text-neutral-400">
            ({luxuryRooms.filter(r => r.status === 'available').length}/{luxuryRooms.length} 空闲)
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {luxuryRooms.map(renderRoom)}
        </div>
      </div>

      <div className="flex items-center gap-6 pt-2 border-t border-neutral-100">
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', config.color)} />
            <span className="text-sm text-neutral-600">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
