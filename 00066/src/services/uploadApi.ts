import { upload, post } from './api';
import type {
  SourceParameters
} from '../types';
import type { ApiResponse } from './api';

export interface UploadModelResponse {
  url: string;
  fileId: string;
}

export const uploadApi = {
  async uploadModel(
    file: File,
    taskId: string
  ): Promise<ApiResponse<UploadModelResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', taskId);

    return upload<UploadModelResponse>('/upload/model', formData);
  },

  async uploadParameters(
    data: SourceParameters,
    taskId: string
  ): Promise<ApiResponse<void>> {
    return post<void>(`/upload/parameters/${taskId}`, data);
  }
};

export default uploadApi;
