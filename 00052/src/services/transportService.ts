import { api } from './api';
import type { TransportTask, NurseConfirmation } from '../types';

export interface TransportQueryParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ConfirmReceiveData {
  nurseName: string;
}

export async function getTransportTasks(params?: TransportQueryParams): Promise<TransportTask[]> {
  return await api.get<TransportTask[]>('/transport/transport-tasks', params);
}

export async function getTransportTask(id: string): Promise<TransportTask> {
  return await api.get<TransportTask>(`/transport/transport-tasks/${id}`);
}

export async function updateProgress(taskId: string, progress: number): Promise<TransportTask> {
  const task = await getTransportTask(taskId);
  const path = task.path || [];
  const pathIndex = Math.min(Math.floor(progress * path.length), path.length - 1);
  const currentPosition = path[pathIndex] || { x: 0, y: 0.5, z: 0 };
  
  return await api.post<TransportTask>(
    `/transport/transport-tasks/${taskId}/update-progress`, 
    { progress: progress * 100, currentPosition }
  );
}

export async function scanQRCode(taskId: string): Promise<{ qrCode: string; valid: boolean }> {
  const response = await api.post<{ qrCode: string }>(`/nurse/transport-tasks/${taskId}/scan-qr`);
  return { qrCode: response.qrCode, valid: true };
}

export async function confirmReceive(
  taskId: string,
  data: ConfirmReceiveData
): Promise<NurseConfirmation> {
  return await api.post<NurseConfirmation>(`/nurse/transport-tasks/${taskId}/confirm-receive`, data);
}
