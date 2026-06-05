import { api } from './api';
import type { InventoryAlert, SystemAlert, ColdStorage } from '../types';

export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  return await api.get<InventoryAlert[]>('/alerts/inventory');
}

export async function getSystemAlerts(): Promise<SystemAlert[]> {
  return await api.get<SystemAlert[]>('/alerts/system');
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await api.post<void>(`/alerts/${alertId}/acknowledge`);
}

export async function getColdStorage(): Promise<ColdStorage> {
  const response = await api.get<ColdStorage[]>('/alerts/cold-storage');
  return Array.isArray(response) ? response[0] : response;
}

export async function updateTemperature(temperature: number): Promise<ColdStorage> {
  const coldStorages = await api.get<ColdStorage[]>('/alerts/cold-storage');
  const coldStorage = Array.isArray(coldStorages) ? coldStorages[0] : coldStorages;
  return await api.post<ColdStorage>('/alerts/cold-storage/temperature', { id: coldStorage.id, temperature });
}
