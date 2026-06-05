import type { TrafficFlow, SignalTiming, Direction, Vehicle, RoadSegment } from '../types';

export function calculateOptimalTiming(
  flowData: TrafficFlow,
  historicalData?: any
): Record<Direction, SignalTiming> {
  const totalFlow = flowData.north + flowData.south + flowData.east + flowData.west;
  const minGreen = 15;
  const maxGreen = 60;
  const yellow = 3;
  const cycle = 100;

  const weights = {
    north: flowData.north / totalFlow,
    south: flowData.south / totalFlow,
    east: flowData.east / totalFlow,
    west: flowData.west / totalFlow,
  };

  const greenTimes: Record<Direction, number> = {
    north: Math.max(minGreen, Math.min(maxGreen, Math.round(weights.north * (cycle - 4 * yellow)))),
    south: Math.max(minGreen, Math.min(maxGreen, Math.round(weights.south * (cycle - 4 * yellow)))),
    east: Math.max(minGreen, Math.min(maxGreen, Math.round(weights.east * (cycle - 4 * yellow)))),
    west: Math.max(minGreen, Math.min(maxGreen, Math.round(weights.west * (cycle - 4 * yellow)))),
  };

  const timing: Record<Direction, SignalTiming> = {} as Record<Direction, SignalTiming>;
  
  (['north', 'south', 'east', 'west'] as Direction[]).forEach(dir => {
    const green = greenTimes[dir];
    const oppositeDir = dir === 'north' ? 'south' : dir === 'south' ? 'north' : dir === 'east' ? 'west' : 'east';
    const red = greenTimes[oppositeDir] + greenTimes[dir === 'north' || dir === 'south' ? 'east' : 'north'] + 2 * yellow;
    const actualRed = cycle - green - yellow;
    
    timing[dir] = {
      green,
      yellow,
      red: actualRed,
    };
  });

  return timing;
}

export function findNearestPoliceOfficer(
  eventLocation: [number, number, number],
  officers: { id: string; name: string; location: [number, number, number]; status: string }[]
): { id: string; name: string; distance: number } | null {
  const available = officers.filter(o => o.status === 'available');
  if (available.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const officer of available) {
    const dist = Math.sqrt(
      Math.pow(eventLocation[0] - officer.location[0], 2) +
      Math.pow(eventLocation[2] - officer.location[2], 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = { id: officer.id, name: officer.name, distance: dist };
    }
  }

  return nearest;
}

export function generateDiversionSuggestions(
  congestionPredictions: { roadId: string; roadName: string; predictions: { timestamp: Date; congestionIndex: number }[] }[],
  roads: RoadSegment[]
): { roadId: string; action: string; reason: string }[] {
  const suggestions: { roadId: string; action: string; reason: string }[] = [];

  for (const pred of congestionPredictions) {
    const futureCongestion = pred.predictions[pred.predictions.length - 1]?.congestionIndex || 0;
    
    if (futureCongestion > 0.8) {
      suggestions.push({
        roadId: pred.roadId,
        action: '关闭入口匝道',
        reason: `预测未来1小时拥堵指数将达到${(futureCongestion * 100).toFixed(0)}%`,
      });
    } else if (futureCongestion > 0.65) {
      suggestions.push({
        roadId: pred.roadId,
        action: '建议绕行',
        reason: `预测未来1小时拥堵指数将达到${(futureCongestion * 100).toFixed(0)}%`,
      });
    }
  }

  return suggestions;
}

export function getCongestionColor(index: number): string {
  if (index < 0.3) return '#2E933C';
  if (index < 0.5) return '#F77F00';
  if (index < 0.7) return '#FF6B00';
  return '#D62828';
}

export function getCongestionLevel(index: number): '畅通' | '轻度拥堵' | '中度拥堵' | '严重拥堵' {
  if (index < 0.3) return '畅通';
  if (index < 0.5) return '轻度拥堵';
  if (index < 0.7) return '中度拥堵';
  return '严重拥堵';
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateDistance(p1: [number, number, number], p2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) +
    Math.pow(p1[1] - p2[1], 2) +
    Math.pow(p1[2] - p2[2], 2)
  );
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function lerpVector3(
  start: [number, number, number],
  end: [number, number, number],
  t: number
): [number, number, number] {
  return [
    lerp(start[0], end[0], t),
    lerp(start[1], end[1], t),
    lerp(start[2], end[2], t),
  ];
}

export function detectAnomaly(vehicle: Vehicle, roads: RoadSegment[]): boolean {
  if (vehicle.speed < 10) return true;
  return false;
}

export function getVehicleColor(type: Vehicle['type']): string {
  switch (type) {
    case 'car': return '#A8A8A8';
    case 'bus': return '#2563EB';
    case 'fire': return '#DC2626';
    case 'ambulance': return '#FFFFFF';
    default: return '#A8A8A8';
  }
}

export function getEventIcon(type: string): string {
  switch (type) {
    case 'congestion': return 'traffic-cone';
    case 'accident': return 'car';
    case 'abnormal_parking': return 'alert-triangle';
    default: return 'alert-circle';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low': return '#2E933C';
    case 'medium': return '#F77F00';
    case 'high': return '#D62828';
    default: return '#888888';
  }
}

export function getRoleName(role: string): string {
  switch (role) {
    case 'traffic_police': return '交警';
    case 'command_director': return '指挥中心主任';
    case 'transport_bureau': return '交通局';
    default: return '未知';
  }
}

export function getPlanTypeName(type: string): string {
  switch (type) {
    case 'road_closure': return '封路';
    case 'diversion': return '分流';
    case 'signal_adjustment': return '信号调整';
    default: return '未知';
  }
}

export function getStatusName(status: string): string {
  switch (status) {
    case 'draft': return '草稿';
    case 'pending_approval': return '待审批';
    case 'approved': return '已批准';
    case 'rejected': return '已驳回';
    case 'executed': return '已执行';
    default: return '未知';
  }
}

export function getApprovalLevelName(level: string): string {
  switch (level) {
    case 'command_center': return '指挥中心';
    case 'transport_bureau': return '交通局';
    case 'city_hall': return '市政府';
    default: return '未知';
  }
}

export function predictCongestionTrend(
  currentData: RoadSegment[],
  historicalData?: any
): { roadId: string; trend: 'improving' | 'worsening' | 'stable' }[] {
  return currentData.map(road => {
    const random = Math.random();
    let trend: 'improving' | 'worsening' | 'stable';
    if (random < 0.3) trend = 'improving';
    else if (random < 0.6) trend = 'worsening';
    else trend = 'stable';
    return { roadId: road.id, trend };
  });
}

export function getDirectionName(direction: string): string {
  switch (direction) {
    case 'north': return '北';
    case 'south': return '南';
    case 'east': return '东';
    case 'west': return '西';
    default: return direction;
  }
}
