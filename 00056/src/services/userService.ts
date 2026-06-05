import Taro from '@tarojs/taro';
import { http } from '@/utils/request';
import { UserInfo, Vehicle, ViolationRecord, InsuranceInfo, MemberInfo, MemberLevel } from '@/types/user';
import { VIOLATION_API_CONFIG } from '@/config/env';

// 登录响应
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserInfo;
  member: MemberInfo;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 违章查询参数
export interface ViolationQueryParams {
  vehicleId?: string;
  plateNumber?: string;
  engineNumber?: string;
  frameNumber?: string;
}

// 代缴参数
export interface ViolationPayParams {
  violationId: string;
  payAmount: number;
  payMethod: 'wechat' | 'alipay' | 'balance';
}

// 保险续保参数
export interface InsuranceRenewParams {
  insuranceId: string;
  insuranceCompany?: string;
  coveragePlan?: string;
  startDate: string;
  endDate: string;
  premium: number;
}

// 服务地址前缀
const API_PREFIX = '/api/v1/user';
const AUTH_PREFIX = '/api/v1/auth';

export const userService = {
  // ============ 认证相关 ============

  // 发送短信验证码
  async sendSmsCode(phone: string, type: 'login' | 'register' | 'bind' = 'login'): Promise<void> {
    console.log('[UserService] 发送验证码:', phone, type);
    await http.post(`${AUTH_PREFIX}/send-sms`, { phone, type });
    Taro.showToast({ title: '验证码已发送', icon: 'success' });
  },

  // 手机号验证码登录
  async loginBySms(phone: string, code: string): Promise<LoginResponse> {
    console.log('[UserService] 短信登录:', phone);
    const response = await http.post<LoginResponse>(`${AUTH_PREFIX}/login-sms`, {
      phone,
      smsCode: code
    });
    return response;
  },

  // 手机号密码登录
  async loginByPassword(phone: string, password: string): Promise<LoginResponse> {
    console.log('[UserService] 密码登录:', phone);
    const response = await http.post<LoginResponse>(`${AUTH_PREFIX}/login-password`, {
      phone,
      password
    });
    return response;
  },

  // 用户注册
  async register(phone: string, code: string, password: string): Promise<LoginResponse> {
    console.log('[UserService] 用户注册:', phone);
    const response = await http.post<LoginResponse>(`${AUTH_PREFIX}/register`, {
      phone,
      smsCode: code,
      password
    });
    return response;
  },

  // 退出登录
  async logout(): Promise<void> {
    console.log('[UserService] 退出登录');
    await http.post(`${AUTH_PREFIX}/logout`);
  },

  // ============ 用户信息 ============

  // 获取当前用户信息
  async getUserInfo(): Promise<UserInfo> {
    console.log('[UserService] 获取用户信息');
    return await http.get<UserInfo>(`${API_PREFIX}/profile`);
  },

  // 更新用户信息
  async updateUserInfo(data: Partial<UserInfo>): Promise<UserInfo> {
    console.log('[UserService] 更新用户信息:', data);
    return await http.put<UserInfo>(`${API_PREFIX}/profile`, data);
  },

  // 上传用户头像
  async uploadAvatar(filePath: string): Promise<{ avatarUrl: string }> {
    console.log('[UserService] 上传头像');
    return await http.upload(`${API_PREFIX}/avatar`, filePath, 'avatar');
  },

  // ============ 车辆管理 ============

  // 获取车辆列表
  async getVehicleList(): Promise<Vehicle[]> {
    console.log('[UserService] 获取车辆列表');
    return await http.get<Vehicle[]>(`${API_PREFIX}/vehicles`);
  },

  // 获取车辆详情
  async getVehicleDetail(vehicleId: string): Promise<Vehicle> {
    console.log('[UserService] 获取车辆详情:', vehicleId);
    return await http.get<Vehicle>(`${API_PREFIX}/vehicles/${vehicleId}`);
  },

  // 绑定车辆
  async bindVehicle(vehicle: Omit<Vehicle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    console.log('[UserService] 绑定车辆:', vehicle.plateNumber);
    return await http.post<Vehicle>(`${API_PREFIX}/vehicles`, vehicle);
  },

  // 更新车辆信息
  async updateVehicle(vehicleId: string, data: Partial<Vehicle>): Promise<Vehicle> {
    console.log('[UserService] 更新车辆:', vehicleId);
    return await http.put<Vehicle>(`${API_PREFIX}/vehicles/${vehicleId}`, data);
  },

  // 删除/解绑车辆
  async deleteVehicle(vehicleId: string): Promise<void> {
    console.log('[UserService] 删除车辆:', vehicleId);
    await http.delete(`${API_PREFIX}/vehicles/${vehicleId}`);
  },

  // 设置默认车辆
  async setDefaultVehicle(vehicleId: string): Promise<void> {
    console.log('[UserService] 设置默认车辆:', vehicleId);
    await http.post(`${API_PREFIX}/vehicles/${vehicleId}/set-default`);
  },

  // ============ 违章查询 ============

  // 获取违章记录
  async getViolations(params?: ViolationQueryParams): Promise<ViolationRecord[]> {
    console.log('[UserService] 获取违章记录:', params);
    return await http.get<ViolationRecord[]>(`${API_PREFIX}/violations`, params);
  },

  // 刷新违章记录（调用第三方API实时查询）
  async refreshViolations(vehicleId: string): Promise<ViolationRecord[]> {
    console.log('[UserService] 刷新违章记录:', vehicleId);
    return await http.post<ViolationRecord[]>(`${API_PREFIX}/violations/refresh`, { vehicleId });
  },

  // 第三方违章查询（直连）
  async queryViolationThirdParty(params: {
    plateNumber: string;
    engineNumber: string;
    frameNumber: string;
    plateType: string;
  }): Promise<ViolationRecord[]> {
    console.log('[UserService] 第三方违章查询:', params.plateNumber);
    const timestamp = Date.now();
    const sign = this.generateSign(VIOLATION_API_CONFIG.appKey, VIOLATION_API_CONFIG.appSecret, timestamp);

    return await http.get<ViolationRecord[]>(`${VIOLATION_API_CONFIG.url}/query`, {
      ...params,
      appKey: VIOLATION_API_CONFIG.appKey,
      timestamp,
      sign
    });
  },

  // 违章代缴
  async payViolation(params: ViolationPayParams): Promise<{
    orderId: string;
    status: 'success' | 'pending' | 'failed';
  }> {
    console.log('[UserService] 违章代缴:', params.violationId);
    return await http.post(`${API_PREFIX}/violations/pay`, params);
  },

  // 查询代缴状态
  async getViolationPayStatus(orderId: string): Promise<{
    status: 'success' | 'pending' | 'failed' | 'processing';
    message?: string;
  }> {
    console.log('[UserService] 查询代缴状态:', orderId);
    return await http.get(`${API_PREFIX}/violations/pay/${orderId}`);
  },

  // ============ 保险服务 ============

  // 获取保险列表
  async getInsuranceList(vehicleId?: string): Promise<InsuranceInfo[]> {
    console.log('[UserService] 获取保险列表:', vehicleId);
    return await http.get<InsuranceInfo[]>(`${API_PREFIX}/insurances`, { vehicleId });
  },

  // 获取保险详情
  async getInsuranceDetail(insuranceId: string): Promise<InsuranceInfo> {
    console.log('[UserService] 获取保险详情:', insuranceId);
    return await http.get<InsuranceInfo>(`${API_PREFIX}/insurances/${insuranceId}`);
  },

  // 保险续保报价
  async getInsuranceQuote(vehicleId: string): Promise<{
    companies: Array<{
      id: string;
      name: string;
      logo: string;
      plans: Array<{
        id: string;
        name: string;
        coverage: string[];
        premium: number;
        originalPremium: number;
      }>;
    }>;
  }> {
    console.log('[UserService] 获取保险报价:', vehicleId);
    return await http.get(`${API_PREFIX}/insurances/quote`, { vehicleId });
  },

  // 保险续保下单
  async renewInsurance(params: InsuranceRenewParams): Promise<{
    orderId: string;
    policyNumber: string;
    status: 'success' | 'pending';
  }> {
    console.log('[UserService] 保险续保:', params.insuranceId);
    return await http.post(`${API_PREFIX}/insurances/renew`, params);
  },

  // 检查保险到期提醒
  async checkInsuranceReminders(): Promise<InsuranceInfo[]> {
    console.log('[UserService] 检查保险到期提醒');
    return await http.get<InsuranceInfo[]>(`${API_PREFIX}/insurances/reminders`);
  },

  // ============ 会员服务 ============

  // 获取会员信息
  async getMemberInfo(): Promise<MemberInfo> {
    console.log('[UserService] 获取会员信息');
    return await http.get<MemberInfo>(`${API_PREFIX}/member`);
  },

  // 获取会员等级规则
  async getMemberLevelRules(): Promise<Array<{
    level: MemberLevel;
    name: string;
    minAnnualSpending: number;
    minRescueTimes: number;
    benefits: string[];
  }>> {
    console.log('[UserService] 获取会员等级规则');
    return await http.get(`${API_PREFIX}/member/level-rules`);
  },

  // 获取会员权益
  async getMemberBenefits(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    levelRequired: MemberLevel;
    remainingCount?: number;
    totalCount?: number;
  }>> {
    console.log('[UserService] 获取会员权益');
    return await http.get(`${API_PREFIX}/member/benefits`);
  },

  // 消费记录
  async getMemberSpendingHistory(params: PaginationParams): Promise<PaginatedResponse<{
    id: string;
    amount: number;
    type: 'service' | 'rescue' | 'violation' | 'insurance' | 'other';
    description: string;
    createdAt: string;
  }>> {
    console.log('[UserService] 获取消费记录');
    return await http.get(`${API_PREFIX}/member/spending-history`, params);
  },

  // ============ 通知设置 ============

  // 获取通知设置
  async getNotificationSettings(): Promise<{
    pushEnabled: boolean;
    smsEnabled: boolean;
    serviceReminder: boolean;
    violationReminder: boolean;
    insuranceReminder: boolean;
    marketingEnabled: boolean;
  }> {
    console.log('[UserService] 获取通知设置');
    return await http.get(`${API_PREFIX}/notification-settings`);
  },

  // 更新通知设置
  async updateNotificationSettings(data: Partial<{
    pushEnabled: boolean;
    smsEnabled: boolean;
    serviceReminder: boolean;
    violationReminder: boolean;
    insuranceReminder: boolean;
    marketingEnabled: boolean;
  }>): Promise<void> {
    console.log('[UserService] 更新通知设置:', data);
    await http.put(`${API_PREFIX}/notification-settings`, data);
  },

  // ============ 工具方法 ============

  // 生成签名（第三方API用）
  private generateSign(appKey: string, appSecret: string, timestamp: number): string {
    const raw = `${appKey}${appSecret}${timestamp}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
};

export default userService;
