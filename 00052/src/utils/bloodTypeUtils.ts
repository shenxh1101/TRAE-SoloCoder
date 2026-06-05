import type { BloodType, BloodComponent, BloodBag } from '../types';

export const ABO_COMPATIBILITY: Record<BloodType, BloodType[]> = {
  'A': ['A', 'O'],
  'B': ['B', 'O'],
  'AB': ['A', 'B', 'AB', 'O'],
  'O': ['O']
};

export const DAILY_USAGE: Record<BloodType, Record<BloodComponent, number>> = {
  'A': { whole_blood: 15, plasma: 10, platelet: 8 },
  'B': { whole_blood: 12, plasma: 8, platelet: 6 },
  'AB': { whole_blood: 5, plasma: 15, platelet: 4 },
  'O': { whole_blood: 20, plasma: 12, platelet: 10 }
};

export function isCompatible(
  patientBloodType: BloodType,
  donorBloodType: BloodType,
  urgency: 'routine' | 'urgent' | 'emergency' = 'routine'
): boolean {
  if (urgency === 'emergency') {
    return true;
  }
  return ABO_COMPATIBILITY[patientBloodType].includes(donorBloodType);
}

export interface CrossMatchResult {
  bag: BloodBag;
  score: number;
  isCompatible: boolean;
  matchType: 'same_type' | 'compatible' | 'emergency';
}

export function crossMatch(
  patientBloodType: BloodType,
  patientComponent: BloodComponent,
  availableBags: BloodBag[],
  urgency: 'routine' | 'urgent' | 'emergency' = 'routine'
): CrossMatchResult | null {
  const candidates = availableBags
    .filter(bag =>
      bag.status === 'available' &&
      bag.component === patientComponent
    )
    .map(bag => {
      let score = 100;
      let matchType: 'same_type' | 'compatible' | 'emergency' = 'compatible';
      const compatible = isCompatible(patientBloodType, bag.bloodType, urgency);

      if (!compatible && urgency !== 'emergency') {
        return null;
      }

      if (bag.bloodType === patientBloodType) {
        score += 30;
        matchType = 'same_type';
      } else if (urgency === 'emergency') {
        matchType = 'emergency';
        score -= 20;
      }

      const expiryDate = new Date(bag.expiryDate);
      const now = new Date();
      const daysToExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      score += Math.min(daysToExpiry, 35);

      if (daysToExpiry < 7) {
        score -= 15;
      }

      return {
        bag,
        score,
        isCompatible: compatible,
        matchType
      };
    })
    .filter((r): r is CrossMatchResult => r !== null)
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

export function get3DayThreshold(
  bloodType: BloodType,
  component: BloodComponent
): number {
  return DAILY_USAGE[bloodType][component] * 3;
}

export function getDaysOfSupply(
  bloodType: BloodType,
  component: BloodComponent,
  currentStock: number
): number {
  const dailyUsage = DAILY_USAGE[bloodType][component];
  return currentStock / dailyUsage;
}

export function calculateInventoryStats(
  bloodBags: BloodBag[]
): Record<BloodType, Record<BloodComponent, { total: number; available: number }>> {
  const stats: Record<BloodType, Record<BloodComponent, { total: number; available: number }>> = {
    'A': { whole_blood: { total: 0, available: 0 }, plasma: { total: 0, available: 0 }, platelet: { total: 0, available: 0 } },
    'B': { whole_blood: { total: 0, available: 0 }, plasma: { total: 0, available: 0 }, platelet: { total: 0, available: 0 } },
    'AB': { whole_blood: { total: 0, available: 0 }, plasma: { total: 0, available: 0 }, platelet: { total: 0, available: 0 } },
    'O': { whole_blood: { total: 0, available: 0 }, plasma: { total: 0, available: 0 }, platelet: { total: 0, available: 0 } }
  };

  bloodBags.forEach(bag => {
    stats[bag.bloodType][bag.component].total++;
    if (bag.status === 'available') {
      stats[bag.bloodType][bag.component].available++;
    }
  });

  return stats;
}

export function findCompatibleBloodBags(
  bloodBags: BloodBag[],
  patientBloodType: BloodType,
  component: BloodComponent
): BloodBag[] {
  const compatibleTypes = ABO_COMPATIBILITY[patientBloodType];
  
  return bloodBags
    .filter(bag =>
      bag.status === 'available' &&
      bag.component === component &&
      compatibleTypes.includes(bag.bloodType)
    )
    .sort((a, b) => {
      const dateA = new Date(a.expiryDate).getTime();
      const dateB = new Date(b.expiryDate).getTime();
      return dateA - dateB;
    });
}
