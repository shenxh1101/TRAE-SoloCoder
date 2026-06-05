import type { ServiceOrder, ServiceProvider, ServiceType } from '../types';

function calculateDistance(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function autoAssignService(
  serviceOrder: Omit<ServiceOrder, 'id' | 'providerId' | 'status'>,
  providers: ServiceProvider[],
  exhibitorLocation: { lat: number; lng: number }
): Array<ServiceProvider & { distance: number; score: number }> {
  const eligibleProviders = providers.filter((p) => {
    const categoryMatch = p.serviceCategory.includes(serviceOrder.serviceType);
    const statusMatch = p.status === 'available';
    const creditMatch = serviceOrder.exhibitorCreditLevel >= 3 || p.rating >= 4.0;
    return categoryMatch && statusMatch && creditMatch;
  });

  return eligibleProviders
    .map((p) => {
      const distance = calculateDistance(p.location, exhibitorLocation);
      const distanceScore = 1 / (distance + 0.5);
      const ratingScore = p.rating / 5;
      const responseScore = 1 / (p.responseTime / 30 + 1);
      const experienceScore = Math.min(p.completedOrders / 100, 1);

      const score = distanceScore * 0.4 + ratingScore * 0.3 + responseScore * 0.2 + experienceScore * 0.1;

      return {
        ...p,
        distance: Math.round(distance * 1000) / 1000,
        score: Math.round(score * 1000) / 1000,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export const serviceTypeLabels: Record<ServiceType, string> = {
  construction: '展位搭建',
  electricity: '电力服务',
  internet: '网络服务',
  cleaning: '清洁服务',
  security: '安保服务',
  logistics: '物流服务',
};

export const serviceTypePrices: Record<ServiceType, { base: number; unit: string }> = {
  construction: { base: 5000, unit: '套' },
  electricity: { base: 2000, unit: '天' },
  internet: { base: 500, unit: '天' },
  cleaning: { base: 300, unit: '次' },
  security: { base: 800, unit: '天' },
  logistics: { base: 1500, unit: '次' },
};
