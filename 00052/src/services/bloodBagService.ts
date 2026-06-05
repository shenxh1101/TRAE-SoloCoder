import { api } from './api';
import type { BloodBag, TestReport } from '../types';

export interface BloodBagQueryParams {
  bloodType?: string;
  component?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateBloodBagData {
  bloodType: string;
  component: string;
  collectionDate: string;
  expiryDate: string;
  storageLocation: {
    row: number;
    col: number;
    shelf: number;
  };
  volume: number;
  donorId: string;
}

export interface UpdateBloodBagData {
  bloodType?: string;
  component?: string;
  collectionDate?: string;
  expiryDate?: string;
  storageLocation?: {
    row: number;
    col: number;
    shelf: number;
  };
  status?: string;
  volume?: number;
  donorId?: string;
}

export interface AddTestReportData {
  testDate: string;
  hemoglobin: number;
  hematocrit: number;
  plateletCount: number;
  wbcCount: number;
  infectiousDisease: boolean;
  remarks: string;
}

export async function getBloodBags(params?: BloodBagQueryParams): Promise<BloodBag[]> {
  return await api.get<BloodBag[]>('/blood-bags', params);
}

export async function getBloodBag(id: string): Promise<BloodBag> {
  return await api.get<BloodBag>(`/blood-bags/${id}`);
}

export async function createBloodBag(data: CreateBloodBagData): Promise<BloodBag> {
  return await api.post<BloodBag>('/blood-bags', data);
}

export async function updateBloodBag(id: string, data: UpdateBloodBagData): Promise<BloodBag> {
  return await api.put<BloodBag>(`/blood-bags/${id}`, data);
}

export async function deleteBloodBag(id: string): Promise<void> {
  await api.delete<void>(`/blood-bags/${id}`);
}

export async function getTestReports(bloodBagId: string): Promise<TestReport[]> {
  return await api.get<TestReport[]>(`/blood-bags/${bloodBagId}/test-reports`);
}

export async function addTestReport(bloodBagId: string, data: AddTestReportData): Promise<TestReport> {
  return await api.post<TestReport>(`/blood-bags/${bloodBagId}/test-reports`, data);
}
