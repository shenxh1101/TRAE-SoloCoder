import { GenerateResult, RatingData, BatchResult } from '../types';

const API_BASE = 'http://localhost:5001/api';

export async function generatePoems(lyrics: string, lineIndex?: number): Promise<GenerateResult> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lyrics, lineIndex }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Generation failed');
  }
  return data.data;
}

export async function generateSinglePoem(lyrics: string): Promise<GenerateResult> {
  const response = await fetch(`${API_BASE}/generate_single`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lyrics }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Generation failed');
  }
  return data.data;
}

export async function submitRating(ratingData: RatingData): Promise<void> {
  const response = await fetch(`${API_BASE}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ratingData),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Rating submission failed');
  }
}

export async function batchProcess(file: File): Promise<{ downloadUrl: string; results: BatchResult[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/batch`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Batch processing failed');
  }
  return data;
}

export function getDownloadUrl(filename: string): string {
  return `${API_BASE}/download/${filename}`;
}
