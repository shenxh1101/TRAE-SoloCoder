import { api } from './api';
import type { Robot } from '../types';

export async function getRobots(): Promise<Robot[]> {
  return await api.get<Robot[]>('/robots');
}

export async function getRobot(id: string): Promise<Robot> {
  return await api.get<Robot>(`/robots/${id}`);
}
