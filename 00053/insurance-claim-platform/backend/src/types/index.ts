export type UserRole = 'headquarters' | 'region' | 'branch';

export interface User {
  id: number;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  region?: string;
  branch?: string;
  created_at: string;
}

export interface Policy {
  id: number;
  policy_no: string;
  holder_name: string;
  insurance_type: string;
  start_date: string;
  end_date: string;
  premium: number;
  coverage: number;
  branch: string;
  region: string;
  created_at: string;
}

export type ClaimStatus = 'pending' | 'assessing' | 'approved' | 'rejected' | 'closed';

export interface Claim {
  id: number;
  claim_no: string;
  policy_id: number;
  policy_no: string;
  holder_name: string;
  insurance_type: string;
  accident_type: string;
  accident_date: string;
  report_date: string;
  status: ClaimStatus;
  claim_amount?: number;
  approved_amount?: number;
  assessor?: string;
  handler?: string;
  branch: string;
  region: string;
  close_date?: string;
  reject_reason?: string;
  created_at: string;
}

export type AssessmentStatus = 'pending' | 'reviewing' | 'completed';

export interface AssessmentRecord {
  id: number;
  claim_id: number;
  claim_no: string;
  assessor: string;
  assessment_date: string;
  total_estimated: number;
  total_actual: number;
  status: AssessmentStatus;
  deviation_flag: number;
  created_at: string;
}

export interface AssessmentItem {
  id: number;
  record_id: number;
  item_name: string;
  category: string;
  estimated_cost: number;
  actual_cost: number;
  deviation: number;
  needs_review: number;
  created_at: string;
}

export type WarningStatus = 'active' | 'acknowledged' | 'resolved';
export type WarningLevel = 'low' | 'medium' | 'high' | 'critical';

export interface EarlyWarning {
  id: number;
  branch: string;
  region: string;
  insurance_type: string;
  accident_type: string;
  anomaly_days: number;
  avg_anomaly_count: number;
  historical_avg: number;
  threshold: number;
  trigger_date: string;
  status: WarningStatus;
  assignee?: string;
  level: WarningLevel;
  created_at: string;
}

export type NotificationType = 'warning' | 'claim' | 'system' | 'assessment';

export interface Notification {
  id: number;
  user_id: number;
  warning_id?: number;
  title: string;
  content: string;
  type: NotificationType;
  is_read: number;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: UserRole;
  region?: string;
  branch?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
