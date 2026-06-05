import { api } from './api';
import type { TransfusionRequest, CrossMatchResult, ApprovalRecord } from '../types';

export interface RequestQueryParams {
  status?: string;
  urgency?: string;
  bloodType?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateRequestData {
  patientId: string;
  requestingDoctor: string;
  department: string;
  bloodType: string;
  component: string;
  volume: number;
  urgency: 'routine' | 'urgent' | 'emergency';
}

export interface ApproveRequestData {
  decision: 'approved' | 'rejected';
  comments: string;
}

export async function getRequests(params?: RequestQueryParams): Promise<TransfusionRequest[]> {
  return await api.get<TransfusionRequest[]>('/transfusion-requests', params);
}

export async function getRequest(id: string): Promise<TransfusionRequest> {
  return await api.get<TransfusionRequest>(`/transfusion-requests/${id}`);
}

export async function createRequest(data: CreateRequestData): Promise<TransfusionRequest> {
  return await api.post<TransfusionRequest>('/transfusion-requests', data);
}

export async function crossMatch(requestId: string): Promise<CrossMatchResult> {
  const response = await api.post<{ crossMatchResult: CrossMatchResult; bloodBag: any; isCompatible: boolean }>(
    `/transfusion-requests/${requestId}/cross-match`
  );
  return response.crossMatchResult;
}

export async function approveRequest(
  requestId: string,
  data: ApproveRequestData
): Promise<ApprovalRecord> {
  return await api.post<ApprovalRecord>(`/approvals/transfusion-requests/${requestId}/approve`, data);
}

export async function createTransport(requestId: string): Promise<{ transportTaskId: string }> {
  const response = await api.post<{ task: { id: string } }>(
    `/transport/transfusion-requests/${requestId}/create-transport`
  );
  return { transportTaskId: response.task.id };
}
