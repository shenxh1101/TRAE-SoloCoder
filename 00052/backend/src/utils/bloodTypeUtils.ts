import type { BloodType, BloodComponent, BloodBag, MatchResult } from '../types';

export const ABO_COMPATIBILITY_MATRIX: Record<BloodType, BloodType[]> = {
  'O': ['O', 'A', 'B', 'AB'],
  'A': ['A', 'AB'],
  'B': ['B', 'AB'],
  'AB': ['AB'],
};

export const DAILY_USAGE_THRESHOLDS: Record<BloodType, Record<BloodComponent, number>> = {
  'O': {
    whole_blood: 25,
    plasma: 18,
    platelet: 12,
  },
  'A': {
    whole_blood: 20,
    plasma: 15,
    platelet: 10,
  },
  'B': {
    whole_blood: 12,
    plasma: 9,
    platelet: 6,
  },
  'AB': {
    whole_blood: 5,
    plasma: 4,
    platelet: 3,
  },
};

export const AVERAGE_DAILY_USAGE: Record<BloodType, Record<BloodComponent, number>> = {
  'O': {
    whole_blood: 8,
    plasma: 6,
    platelet: 4,
  },
  'A': {
    whole_blood: 7,
    plasma: 5,
    platelet: 3,
  },
  'B': {
    whole_blood: 4,
    plasma: 3,
    platelet: 2,
  },
  'AB': {
    whole_blood: 2,
    plasma: 1.5,
    platelet: 1,
  },
};

export function isCompatible(donorType: BloodType, recipientType: BloodType): boolean {
  const compatibleRecipients = ABO_COMPATIBILITY_MATRIX[donorType];
  return compatibleRecipients.includes(recipientType);
}

export function getCompatibleDonors(recipientType: BloodType): BloodType[] {
  const donors: BloodType[] = [];
  for (const [donorType, recipients] of Object.entries(ABO_COMPATIBILITY_MATRIX) as [BloodType, BloodType[]][]) {
    if (recipients.includes(recipientType)) {
      donors.push(donorType);
    }
  }
  return donors;
}

export function getCompatibleRecipients(donorType: BloodType): BloodType[] {
  return [...ABO_COMPATIBILITY_MATRIX[donorType]];
}

export function crossMatch(
  patientBloodType: BloodType,
  bloodBag: BloodBag
): MatchResult {
  if (isCompatible(bloodBag.bloodType, patientBloodType)) {
    return 'compatible';
  }
  return 'incompatible';
}

export interface InventoryStats {
  total: number;
  available: number;
  allocated: number;
  used: number;
  expired: number;
  quarantined: number;
}

export function calculateInventoryStats(
  bloodBags: BloodBag[]
): Record<BloodType, Record<BloodComponent, InventoryStats>> {
  const stats: Record<BloodType, Record<BloodComponent, InventoryStats>> = {
    'A': createEmptyComponentStats(),
    'B': createEmptyComponentStats(),
    'AB': createEmptyComponentStats(),
    'O': createEmptyComponentStats(),
  };

  for (const bag of bloodBags) {
    const typeStats = stats[bag.bloodType][bag.component];
    typeStats.total++;
    typeStats[bag.status]++;
  }

  return stats;
}

function createEmptyComponentStats(): Record<BloodComponent, InventoryStats> {
  return {
    whole_blood: createEmptyStats(),
    plasma: createEmptyStats(),
    platelet: createEmptyStats(),
  };
}

function createEmptyStats(): InventoryStats {
  return {
    total: 0,
    available: 0,
    allocated: 0,
    used: 0,
    expired: 0,
    quarantined: 0,
  };
}

export function get3DayThreshold(
  bloodType: BloodType,
  component: BloodComponent
): number {
  const dailyUsage = DAILY_USAGE_THRESHOLDS[bloodType][component];
  return dailyUsage * 3;
}

export function get7DayThreshold(
  bloodType: BloodType,
  component: BloodComponent
): number {
  const dailyUsage = DAILY_USAGE_THRESHOLDS[bloodType][component];
  return dailyUsage * 7;
}

export function getDaysOfSupply(
  bloodType: BloodType,
  component: BloodComponent,
  available: number
): number {
  const dailyUsage = AVERAGE_DAILY_USAGE[bloodType][component];
  if (dailyUsage === 0) {
    return available > 0 ? 999 : 0;
  }
  return Math.round((available / dailyUsage) * 10) / 10;
}

export function getInventorySeverity(
  bloodType: BloodType,
  component: BloodComponent,
  available: number
): 'normal' | 'low' | 'medium' | 'high' | 'critical' {
  const days = getDaysOfSupply(bloodType, component, available);
  const threshold3 = get3DayThreshold(bloodType, component);
  const threshold7 = get7DayThreshold(bloodType, component);

  if (available <= 0) {
    return 'critical';
  }
  if (days <= 2) {
    return 'critical';
  }
  if (available <= threshold3) {
    return 'high';
  }
  if (available <= threshold7) {
    return 'medium';
  }
  if (days <= 7) {
    return 'low';
  }
  return 'normal';
}

export function findCompatibleBloodBags(
  patientBloodType: BloodType,
  component: BloodComponent,
  bloodBags: BloodBag[]
): BloodBag[] {
  const compatibleDonors = getCompatibleDonors(patientBloodType);
  return bloodBags.filter(
    (bag) =>
      bag.status === 'available' &&
      bag.component === component &&
      compatibleDonors.includes(bag.bloodType)
  );
}

export function sortBloodBagsByPriority(bloodBags: BloodBag[]): BloodBag[] {
  return [...bloodBags].sort((a, b) => {
    const dateA = new Date(a.expiryDate).getTime();
    const dateB = new Date(b.expiryDate).getTime();
    return dateA - dateB;
  });
}

export function getBloodTypeLabel(bloodType: BloodType): string {
  const labels: Record<BloodType, string> = {
    'A': 'A型',
    'B': 'B型',
    'AB': 'AB型',
    'O': 'O型',
  };
  return labels[bloodType];
}

export function getComponentLabel(component: BloodComponent): string {
  const labels: Record<BloodComponent, string> = {
    whole_blood: '全血',
    plasma: '血浆',
    platelet: '血小板',
  };
  return labels[component];
}
