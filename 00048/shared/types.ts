export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'user' | 'volunteer' | 'hospital' | 'admin';
  avatar?: string;
  isVolunteer: boolean;
  volunteerStatus?: 'pending' | 'approved' | 'rejected';
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface StrayReport {
  id: string;
  reporterId: string;
  reporterName?: string;
  photos: string[];
  address: string;
  lat: number;
  lng: number;
  city: string;
  district?: string;
  animalType: 'dog' | 'cat' | 'other';
  description: string;
  conditionStatus: 'healthy' | 'injured' | 'sick' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'notified' | 'rescuing' | 'rescued';
  createdAt: string;
}

export interface RescueTask {
  id: string;
  reportId: string;
  volunteerId?: string;
  volunteerName?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  address: string;
  lat: number;
  lng: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  animalType?: string;
  description?: string;
  notes?: string;
  acceptedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  district?: string;
  lat: number;
  lng: number;
  phone?: string;
}

export interface Animal {
  id: string;
  name: string;
  type: 'dog' | 'cat' | 'other';
  breed?: string;
  age?: string;
  gender: 'male' | 'female' | 'unknown';
  photos: string[];
  personality: string[];
  rescueTaskId: string;
  hospitalId?: string;
  hospitalName?: string;
  status: 'hospitalized' | 'recovering' | 'recovered' | 'available' | 'adopted';
  medicalRecords: MedicalRecord[];
  vaccines: VaccineRecord[];
  isNeutered: boolean;
  recoveryProgress: number;
  estimatedRecovery?: string;
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  animalId: string;
  hospitalId: string;
  hospitalName?: string;
  diagnosis: string;
  treatment: string;
  medication: string;
  notes?: string;
  date: string;
}

export interface VaccineRecord {
  id: string;
  animalId: string;
  name: string;
  date: string;
  nextDate?: string;
}

export interface AdoptionQuestionnaire {
  id: string;
  userId: string;
  livingSpace: 'apartment' | 'house_with_yard' | 'house_without_yard';
  spaceSize: 'small' | 'medium' | 'large';
  familyMembers: number;
  hasChildren: boolean;
  hasOtherPets: boolean;
  otherPetTypes?: string;
  workHours: number;
  exerciseFreq: 'rarely' | 'sometimes' | 'often' | 'very_often';
  petExperience: 'none' | 'some' | 'experienced';
  reason?: string;
  createdAt: string;
}

export interface AdoptionMatch {
  animalId: string;
  animal?: Animal;
  matchScore: number;
  matchReasons: string[];
}

export interface AdoptionAgreement {
  id: string;
  adopterId: string;
  animalId: string;
  animalName?: string;
  signedAt: string;
  terms: string;
}

export interface FollowUp {
  id: string;
  agreementId: string;
  month: 1 | 3 | 6;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  photos: string[];
  notes?: string;
  completedAt?: string;
  animalName?: string;
  animalPhoto?: string;
}

export interface Donation {
  id: string;
  userId: string;
  type: 'one_time' | 'monthly';
  amount: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Fundraise {
  id: string;
  initiatorId: string;
  animalId: string;
  animalName?: string;
  animalPhoto?: string;
  hospitalId: string;
  hospitalName?: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'active' | 'funded' | 'disbursed' | 'completed';
  participants: number;
  createdAt: string;
}

export interface DashboardData {
  totalRescues: number;
  adoptionRate: number;
  pendingTasks: number;
  activeVolunteers: number;
  totalDonations: number;
  hospitalAnimals: { hospital: string; count: number }[];
  monthlyTrend: { month: string; rescues: number; adoptions: number }[];
  cityStats: { city: string; rescues: number; adoptions: number; rate: number }[];
}

export interface HeatmapPoint {
  city: string;
  district?: string;
  lat: number;
  lng: number;
  count: number;
}
