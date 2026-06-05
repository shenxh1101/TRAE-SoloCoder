import Taro from '@tarojs/taro';
import { http } from '@/utils/request';
import { mapService } from '@/services/mapService';
import { wsService } from '@/services/wsService';
import {
  RescueRequest,
  RescueVehicle,
  RescueType,
  AdminDashboardData,
  MonthlyReport,
  Location
} from '@/types/rescue';
import { PaginationParams, PaginatedResponse } from './userService';

// 创建救援请求参数
export interface CreateRescueParams {
  vehicleId: string;
  plateNumber: string;
  type: RescueType;
  description: string;
  location: Location;
  contactName?: string;
  contactPhone?: string;
  images?: string[];
  urgencyLevel?: 'normal' | 'urgent' | 'emergency';
}

// 看板查询参数
export interface DashboardQueryParams {
  city?: string;
  startDate?: string;
  endDate?: string;
  storeId?: string;
  timeGranularity?: 'hour' | 'day' | 'week' | 'month';
}

// 报表查询参数
export interface ReportQueryParams {
  month: string;
  city?: string;
  storeId?: string;
  format?: 'excel' | 'pdf';
  includeCharts?: boolean;
}

const API_PREFIX = '/api/v1/rescue';
const ADMIN_PREFIX = '/api/v1/admin';

export const rescueService = {
  // ============ 定位服务 ============

  // 获取当前位置（集成地图SDK）
  async getCurrentLocation(enableHighAccuracy: boolean = true): Promise<Location> {
    console.log('[RescueService] 获取当前位置');

    try {
      const location = await mapService.getCurrentLocation(enableHighAccuracy, false);
      const geocode = await mapService.reverseGeocode(location);

      return {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: geocode.formattedAddress
      };
    } catch (error) {
      console.error('[RescueService] 获取位置失败:', error);
      throw error;
    }
  },

  // 获取附近救援车辆
  async getNearbyRescueVehicles(
    location: Location,
    radius: number = 10000,
    type?: RescueType
  ): Promise<RescueVehicle[]> {
    console.log('[RescueService] 获取附近救援车辆，位置:', location.address, '半径:', radius);

    const vehicles = await http.get<RescueVehicle[]>(`${API_PREFIX}/vehicles/nearby`, {
      latitude: location.latitude,
      longitude: location.longitude,
      radius,
      type
    });

    // 计算实际距离
    return vehicles.map(vehicle => ({
      ...vehicle,
      distance: mapService.getDistance(location, {
        latitude: vehicle.currentLatitude,
        longitude: vehicle.currentLongitude
      })
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  },

  // ============ 救援请求管理 ============

  // 创建救援请求
  async createRescueRequest(params: CreateRescueParams): Promise<RescueRequest> {
    console.log('[RescueService] 创建救援请求:', params.type, '位置:', params.location.address);

    // 检查位置权限
    const authStatus = await mapService.checkLocationAuth();
    if (authStatus !== 'authorized') {
      const granted = await mapService.requestLocationAuth();
      if (!granted) {
        throw new Error('定位权限未授权，无法发起救援');
      }
    }

    // 获取精确定位
    const location = await this.getCurrentLocation(true);

    const request = await http.post<RescueRequest>(`${API_PREFIX}/requests`, {
      ...params,
      location: {
        ...params.location,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address
      }
    });

    Taro.showToast({ title: '救援已派出', icon: 'success' });

    // 订阅该救援的实时推送
    this.subscribeToRescueUpdates(request.id);

    return request;
  },

  // 获取救援请求列表
  async getRescueRequests(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<RescueRequest>> {
    console.log('[RescueService] 获取救援请求列表，状态:', params?.status);
    return await http.get(`${API_PREFIX}/requests`, params);
  },

  // 获取救援详情
  async getRescueDetail(rescueId: string): Promise<RescueRequest> {
    console.log('[RescueService] 获取救援详情:', rescueId);
    return await http.get<RescueRequest>(`${API_PREFIX}/requests/${rescueId}`);
  },

  // 获取救援车辆实时位置（支持轮询和WebSocket两种方式）
  async updateRescueLocation(rescueId: string): Promise<{
    location: Location;
    eta: number;
    speed?: number;
    heading?: number;
  }> {
    console.log('[RescueService] 获取救援车辆实时位置:', rescueId);
    return await http.get(`${API_PREFIX}/requests/${rescueId}/location`);
  },

  // 取消救援
  async cancelRescue(rescueId: string, reason?: string): Promise<void> {
    console.log('[RescueService] 取消救援:', rescueId);
    await http.post(`${API_PREFIX}/requests/${rescueId}/cancel`, { reason });
    this.unsubscribeFromRescueUpdates(rescueId);
    Taro.showToast({ title: '已取消救援', icon: 'success' });
  },

  // 完成救援
  async completeRescue(
    rescueId: string,
    actualCost: number,
    remark?: string,
    images?: string[]
  ): Promise<void> {
    console.log('[RescueService] 完成救援:', rescueId, '费用:', actualCost);
    await http.post(`${API_PREFIX}/requests/${rescueId}/complete`, {
      actualCost,
      remark,
      images
    });
    this.unsubscribeFromRescueUpdates(rescueId);
    Taro.showToast({ title: '救援完成', icon: 'success' });
  },

  // 评价救援
  async reviewRescue(
    rescueId: string,
    rating: number,
    content?: string,
    driverRating?: number
  ): Promise<void> {
    console.log('[RescueService] 评价救援:', rescueId, '评分:', rating);
    await http.post(`${API_PREFIX}/requests/${rescueId}/review`, {
      rating,
      content,
      driverRating
    });
    Taro.showToast({ title: '评价成功', icon: 'success' });
  },

  // ============ WebSocket实时推送 ============

  // 订阅救援实时更新
  subscribeToRescueUpdates(rescueId: string): () => void {
    console.log('[RescueService] 订阅救援更新:', rescueId);

    // 确保WebSocket连接
    wsService.connect();

    // 发送订阅消息
    wsService.send('subscribe', { rescueId }).catch(error => {
      console.error('[RescueService] 订阅失败:', error);
    });

    // 返回取消订阅函数
    return () => {
      this.unsubscribeFromRescueUpdates(rescueId);
    };
  },

  // 取消订阅救援更新
  unsubscribeFromRescueUpdates(rescueId: string): void {
    console.log('[RescueService] 取消订阅救援更新:', rescueId);
    wsService.send('unsubscribe', { rescueId }).catch(() => {
      // 忽略取消订阅错误
    });
  },

  // 监听救援位置更新
  onRescueLocationUpdate(
    rescueId: string,
    callback: (data: {
      rescueId: string;
      location: Location;
      eta: number;
      speed?: number;
    }) => void
  ): () => void {
    return wsService.subscribe(`rescue:${rescueId}:location`, (message) => {
      callback(message.data);
    });
  },

  // 监听救援状态更新
  onRescueStatusUpdate(
    rescueId: string,
    callback: (data: {
      rescueId: string;
      status: string;
      statusText: string;
      timestamp: number;
    }) => void
  ): () => void {
    return wsService.subscribe(`rescue:${rescueId}:status`, (message) => {
      callback(message.data);
    });
  },

  // ============ 管理员看板 ============

  // 获取看板数据（支持多维度筛选）
  async getDashboardData(params: DashboardQueryParams = {}): Promise<AdminDashboardData> {
    console.log('[RescueService] 获取管理员看板数据，参数:', params);
    return await http.get<AdminDashboardData>(`${ADMIN_PREFIX}/dashboard`, params);
  },

  // 获取实时订单统计
  async getRealtimeStats(params?: { city?: string; storeId?: string }): Promise<{
    totalOrders: number;
    todayOrders: number;
    activeRescues: number;
    pendingOrders: number;
    avgResponseTime: number;
    avgCompletionTime: number;
    hourlyOrderData: Array<{ hour: number; count: number }>;
    realtimeOrderStream: Array<{
      id: string;
      type: string;
      city: string;
      amount: number;
      time: string;
    }>;
  }> {
    console.log('[RescueService] 获取实时统计');
    return await http.get(`${ADMIN_PREFIX}/dashboard/realtime-stats`, params);
  },

  // 获取门店排名数据
  async getStoreRanking(params?: {
    city?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'orderCount' | 'revenue' | 'responseTime' | 'completionRate';
  }): Promise<Array<{
    storeId: string;
    storeName: string;
    city: string;
    orderCount: number;
    rescueCount: number;
    revenue: number;
    avgResponseTime: number;
    completionRate: number;
    customerSatisfaction: number;
    trend: 'up' | 'down' | 'stable';
  }>> {
    console.log('[RescueService] 获取门店排名');
    return await http.get(`${ADMIN_PREFIX}/dashboard/store-ranking`, params);
  },

  // 获取工单完成率趋势
  async getCompletionRateTrend(params?: {
    city?: string;
    startDate?: string;
    endDate?: string;
    granularity?: 'day' | 'week' | 'month';
  }): Promise<Array<{
    date: string;
    totalOrders: number;
    completedOrders: number;
    completionRate: number;
    cancelledOrders: number;
  }>> {
    console.log('[RescueService] 获取完成率趋势');
    return await http.get(`${ADMIN_PREFIX}/dashboard/completion-rate-trend`, params);
  },

  // 获取救援响应时长分布
  async getResponseTimeDistribution(params?: {
    city?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    range: string; // '0-5min', '5-10min', '10-20min', '20-30min', '30+min'
    count: number;
    percentage: number;
  }>> {
    console.log('[RescueService] 获取响应时长分布');
    return await http.get(`${ADMIN_PREFIX}/dashboard/response-time-distribution`, params);
  },

  // ============ 报表管理 ============

  // 获取月度报表数据
  async getMonthlyReport(params: ReportQueryParams): Promise<MonthlyReport> {
    console.log('[RescueService] 获取月度报表:', params.month);
    return await http.get<MonthlyReport>(`${ADMIN_PREFIX}/reports/monthly`, params);
  },

  // 导出报表
  async exportReport(params: ReportQueryParams): Promise<{
    downloadUrl: string;
    fileName: string;
    fileSize: number;
    expiresAt: string;
  }> {
    console.log('[RescueService] 导出报表:', params.month, '格式:', params.format);

    const result = await http.post(`${ADMIN_PREFIX}/reports/export`, params);

    Taro.showToast({ title: '报表导出成功', icon: 'success' });

    return result;
  },

  // 下载报表文件
  async downloadReport(downloadUrl: string, fileName: string): Promise<void> {
    console.log('[RescueService] 下载报表:', fileName);

    if (Taro.getEnv() === Taro.ENV_TYPE.WEB) {
      // Web端：创建下载链接
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // 小程序端：保存到本地
      const res = await Taro.downloadFile({ url: downloadUrl });
      if (res.tempFilePath) {
        await Taro.saveFile({ tempFilePath: res.tempFilePath });
        Taro.showToast({ title: '已保存到本地', icon: 'success' });
      }
    }
  },

  // 获取报表列表
  async getReportList(params?: {
    page?: number;
    pageSize?: number;
    month?: string;
    type?: 'monthly' | 'quarterly' | 'annual';
  }): Promise<PaginatedResponse<{
    id: string;
    month: string;
    name: string;
    type: string;
    createdAt: string;
    generatedBy: string;
    downloadCount: number;
  }>> {
    console.log('[RescueService] 获取报表列表');
    return await http.get(`${ADMIN_PREFIX}/reports`, params);
  },

  // ============ 救援车辆管理 ============

  // 获取救援车辆列表
  async getRescueVehicles(params?: {
    status?: 'idle' | 'busy' | 'offline' | 'maintenance';
    city?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<RescueVehicle>> {
    console.log('[RescueService] 获取救援车辆列表');
    return await http.get(`${API_PREFIX}/vehicles`, params);
  },

  // 更新救援车辆状态（技师端）
  async updateVehicleStatus(
    vehicleId: string,
    status: RescueVehicle['status'],
    location?: Location
  ): Promise<void> {
    console.log('[RescueService] 更新车辆状态:', vehicleId, status);
    await http.post(`${API_PREFIX}/vehicles/${vehicleId}/status`, {
      status,
      location
    });
  },

  // ============ 工具方法 ============

  getRescueTypeText(type: RescueType): string {
    const typeMap: Record<RescueType, string> = {
      'towing': '拖车救援',
      'battery': '搭电服务',
      'tire_change': '换胎服务',
      'fuel_delivery': '送油服务',
      'lockout': '开锁服务',
      'winch': '脱困救援',
      'jump_start': '电瓶搭电',
      'on_site_repair': '现场维修'
    };
    return typeMap[type] || type;
  },

  getRescueStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '等待派单',
      'dispatched': '救援车已派出',
      'arrived': '已到达现场',
      'in_progress': '救援进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  }
};

export default rescueService;
