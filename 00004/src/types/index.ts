export interface PoemResult {
  text: string;
  rating: number;
}

export interface GenerateResult {
  original: string;
  folk: PoemResult;
  ancient: PoemResult;
  cyberpunk: PoemResult;
}

export interface BatchResult {
  line: string;
  folk: PoemResult;
  ancient: PoemResult;
  cyberpunk: PoemResult;
}

export type StyleType = 'folk' | 'ancient' | 'cyberpunk';

export interface RatingData {
  style: StyleType;
  original: string;
  result: string;
  rating: number;
}
