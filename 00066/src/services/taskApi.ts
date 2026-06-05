import { get, post, put } from './api';
import type {
  Task,
  TaskStatus,
  SourceParameters,
  CalculationResult
} from '../types';
import type { ApiResponse } from './api';

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaskResponse {
  task: Task;
}

export interface CreateTaskRequest {
  roomId: string;
  roomName?: string;
  sourceParameters: SourceParameters;
}

export const taskApi = {
  async getTasks(params?: {
    status?: TaskStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<TaskListResponse>> {
    return get<TaskListResponse>('/tasks', params as Record<string, unknown>);
  },

  async getTaskById(id: string): Promise<ApiResponse<TaskResponse>> {
    return get<TaskResponse>(`/tasks/${id}`);
  },

  async getResults(taskId: string): Promise<ApiResponse<CalculationResult>> {
    return get<CalculationResult>(`/tasks/${taskId}/results`);
  },

  async startCalculation(taskId: string): Promise<ApiResponse<void>> {
    return post<void>(`/tasks/${taskId}/start`);
  },

  async createTask(data: CreateTaskRequest): Promise<ApiResponse<TaskResponse>> {
    return post<TaskResponse>('/tasks', data);
  },

  async updateTaskStatus(
    id: string,
    status: TaskStatus
  ): Promise<ApiResponse<void>> {
    return put<void>(`/tasks/${id}/status`, { status });
  },

  getTaskProgress(taskId: string): EventSource {
    const token = localStorage.getItem('token');
    const url = new URL(`http://localhost:3001/api/tasks/${taskId}/progress`);
    
    if (token) {
      url.searchParams.set('token', token);
    }

    const eventSource = new EventSource(url.toString());
    
    if (import.meta.env.DEV) {
      console.log(`[SSE] Connected to task progress stream for task ${taskId}`);
      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
      };
    }

    return eventSource;
  }
};

export default taskApi;
