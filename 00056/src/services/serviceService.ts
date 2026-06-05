import Taro from '@tarojs/taro';
import { http } from '@/utils/request';
import { ServicePackage, Store, Booking, WorkOrder, OrderRecord, BookingTimeSlot } from '@/types/service';
import { mapService, Location } from '@/services/mapService';
import { PaginationParams, PaginatedResponse } from './userService';

// 套餐查询参数
export interface PackageQueryParams extends PaginationParams {
  type?: string;
  vehicleId?: string;
  mileage?: number;
  sortBy?: 'price' | 'sales' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

// 门店查询参数
export interface StoreQueryParams extends PaginationParams {
  serviceType?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  sortBy?: 'distance' | 'rating' | 'sales';
}

// 创建预约参数
export interface CreateBookingParams {
  packageId: string;
  storeId: string;
  vehicleId: string;
  bookingDate: string;
  bookingTime: string;
  contactName: string;
  contactPhone: string;
  remark?: string;
  items?: Array<{
    serviceItemId: string;
    serviceItemName: string;
    quantity: number;
  }>;
}

// 工单支付参数
export interface WorkOrderPayParams {
  workOrderId: string;
  amount: number;
  payMethod: 'wechat' | 'alipay' | 'balance' | 'member';
  usePoints?: number;
  useCouponId?: string;
}

// 服务评价参数
export interface ServiceReviewParams {
  orderId: string;
  rating: number;
  content?: string;
  images?: string[];
  technicianRating?: number;
  storeRating?: number;
}

const API_PREFIX = '/api/v1/service';

export const serviceService = {
  // ============ 养护套餐 ============

  // 获取智能推荐套餐
  async getRecommendedPackages(mileage: number, vehicleId?: string): Promise<ServicePackage[]> {
    console.log('[ServiceService] 获取推荐套餐，里程:', mileage, '车辆:', vehicleId);
    return await http.get<ServicePackage[]>(`${API_PREFIX}/packages/recommended`, {
      mileage,
      vehicleId
    });
  },

  // 获取套餐列表
  async getPackageList(params: PackageQueryParams): Promise<PaginatedResponse<ServicePackage>> {
    console.log('[ServiceService] 获取套餐列表:', params);
    return await http.get(`${API_PREFIX}/packages`, params);
  },

  // 获取所有套餐
  async getAllPackages(type?: string): Promise<ServicePackage[]> {
    console.log('[ServiceService] 获取所有套餐，类型:', type);
    return await http.get<ServicePackage[]>(`${API_PREFIX}/packages/all`, { type });
  },

  // 获取套餐详情
  async getPackageDetail(packageId: string): Promise<ServicePackage> {
    console.log('[ServiceService] 获取套餐详情:', packageId);
    return await http.get<ServicePackage>(`${API_PREFIX}/packages/${packageId}`);
  },

  // ============ 门店管理 ============

  // 获取门店列表（支持定位和距离排序）
  async getStores(params?: StoreQueryParams): Promise<Store[]> {
    console.log('[ServiceService] 获取门店列表:', params);

    let queryParams = { ...params };

    // 如果没有传坐标，尝试获取当前位置
    if (!queryParams.latitude || !queryParams.longitude) {
      try {
        const location = await mapService.getCurrentLocation();
        queryParams.latitude = location.latitude;
        queryParams.longitude = location.longitude;
      } catch (error) {
        console.warn('[ServiceService] 获取位置失败，使用默认排序');
      }
    }

    const stores = await http.get<Store[]>(`${API_PREFIX}/stores`, queryParams);

    // 计算每个门店的距离
    if (queryParams.latitude && queryParams.longitude) {
      const userLocation: Location = {
        latitude: queryParams.latitude,
        longitude: queryParams.longitude
      };

      return stores.map(store => ({
        ...store,
        distance: mapService.getDistance(userLocation, {
          latitude: store.latitude,
          longitude: store.longitude
        })
      }));
    }

    return stores;
  },

  // 获取门店详情
  async getStoreDetail(storeId: string): Promise<Store> {
    console.log('[ServiceService] 获取门店详情:', storeId);
    return await http.get<Store>(`${API_PREFIX}/stores/${storeId}`);
  },

  // 获取门店服务项目
  async getStoreServices(storeId: string): Promise<Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    duration: number;
    description: string;
    available: boolean;
  }>> {
    console.log('[ServiceService] 获取门店服务项目:', storeId);
    return await http.get(`${API_PREFIX}/stores/${storeId}/services`);
  },

  // 获取门店技师
  async getStoreTechnicians(storeId: string): Promise<Array<{
    id: string;
    name: string;
    avatar: string;
    title: string;
    rating: number;
    orderCount: number;
    skills: string[];
  }>> {
    console.log('[ServiceService] 获取门店技师:', storeId);
    return await http.get(`${API_PREFIX}/stores/${storeId}/technicians`);
  },

  // ============ 预约管理 ============

  // 获取可用时间段
  async getAvailableTimeSlots(storeId: string, date: string, packageId?: string): Promise<BookingTimeSlot[]> {
    console.log('[ServiceService] 获取可用时间段，门店:', storeId, '日期:', date);
    return await http.get<BookingTimeSlot[]>(`${API_PREFIX}/bookings/available-slots`, {
      storeId,
      date,
      packageId
    });
  },

  // 创建预约
  async createBooking(params: CreateBookingParams): Promise<Booking> {
    console.log('[ServiceService] 创建预约:', params.packageId);
    const booking = await http.post<Booking>(`${API_PREFIX}/bookings`, params);
    Taro.showToast({ title: '预约成功', icon: 'success' });
    return booking;
  },

  // 获取预约列表
  async getBookings(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Booking>> {
    console.log('[ServiceService] 获取预约列表:', params);
    return await http.get(`${API_PREFIX}/bookings`, params);
  },

  // 获取预约详情
  async getBookingDetail(bookingId: string): Promise<Booking> {
    console.log('[ServiceService] 获取预约详情:', bookingId);
    return await http.get<Booking>(`${API_PREFIX}/bookings/${bookingId}`);
  },

  // 取消预约
  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    console.log('[ServiceService] 取消预约:', bookingId);
    await http.post(`${API_PREFIX}/bookings/${bookingId}/cancel`, { reason });
    Taro.showToast({ title: '已取消', icon: 'success' });
  },

  // 重新预约
  async rescheduleBooking(bookingId: string, newDate: string, newTime: string): Promise<Booking> {
    console.log('[ServiceService] 重新预约:', bookingId, newDate, newTime);
    return await http.post<Booking>(`${API_PREFIX}/bookings/${bookingId}/reschedule`, {
      bookingDate: newDate,
      bookingTime: newTime
    });
  },

  // ============ 工单管理 ============

  // 扫码生成工单
  async scanWorkOrder(qrCode: string): Promise<WorkOrder> {
    console.log('[ServiceService] 扫码生成工单，二维码:', qrCode);
    try {
      return await http.post<WorkOrder>(`${API_PREFIX}/work-orders/scan`, { qrCode });
    } catch (error) {
      Taro.showToast({ title: '无效的二维码', icon: 'none' });
      throw error;
    }
  },

  // 获取工单详情
  async getWorkOrder(workOrderId: string): Promise<WorkOrder> {
    console.log('[ServiceService] 获取工单详情:', workOrderId);
    return await http.get<WorkOrder>(`${API_PREFIX}/work-orders/${workOrderId}`);
  },

  // 获取工单列表
  async getWorkOrders(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<WorkOrder>> {
    console.log('[ServiceService] 获取工单列表:', params);
    return await http.get(`${API_PREFIX}/work-orders`, params);
  },

  // 确认工单（用户确认报价）
  async confirmWorkOrder(workOrderId: string): Promise<WorkOrder> {
    console.log('[ServiceService] 确认工单:', workOrderId);
    const result = await http.post<WorkOrder>(`${API_PREFIX}/work-orders/${workOrderId}/confirm`);
    Taro.showToast({ title: '确认成功', icon: 'success' });
    return result;
  },

  // 工单报价（技师）
  async quoteWorkOrder(workOrderId: string, items: Array<{
    itemName: string;
    itemType: 'material' | 'labor';
    quantity: number;
    unitPrice: number;
    remark?: string;
  }>): Promise<WorkOrder> {
    console.log('[ServiceService] 工单报价:', workOrderId);
    return await http.post<WorkOrder>(`${API_PREFIX}/work-orders/${workOrderId}/quote`, { items });
  },

  // 支付工单
  async payWorkOrder(params: WorkOrderPayParams): Promise<{
    orderId: string;
    payStatus: 'success' | 'pending' | 'failed';
    payAmount: number;
    payTime?: string;
  }> {
    console.log('[ServiceService] 支付工单:', params.workOrderId, '金额:', params.amount);
    const result = await http.post(`${API_PREFIX}/work-orders/${params.workOrderId}/pay`, params);
    Taro.showToast({ title: '支付成功', icon: 'success' });
    return result;
  },

  // 开始服务
  async startWorkOrder(workOrderId: string): Promise<WorkOrder> {
    console.log('[ServiceService] 开始服务:', workOrderId);
    return await http.post<WorkOrder>(`${API_PREFIX}/work-orders/${workOrderId}/start`);
  },

  // 完成服务
  async completeWorkOrder(workOrderId: string, remark?: string): Promise<WorkOrder> {
    console.log('[ServiceService] 完成服务:', workOrderId);
    return await http.post<WorkOrder>(`${API_PREFIX}/work-orders/${workOrderId}/complete`, { remark });
  },

  // 更新工单进度
  async updateWorkOrderProgress(
    workOrderId: string,
    progressStep: string,
    description?: string,
    images?: string[]
  ): Promise<WorkOrder> {
    console.log('[ServiceService] 更新工单进度:', workOrderId, progressStep);
    return await http.post<WorkOrder>(`${API_PREFIX}/work-orders/${workOrderId}/progress`, {
      progressStep,
      description,
      images
    });
  },

  // ============ 订单记录 ============

  // 获取订单记录列表
  async getOrderRecords(params?: {
    type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<OrderRecord>> {
    console.log('[ServiceService] 获取订单列表:', params);
    return await http.get(`${API_PREFIX}/orders`, params);
  },

  // 获取订单详情
  async getOrderDetail(orderId: string): Promise<OrderRecord> {
    console.log('[ServiceService] 获取订单详情:', orderId);
    return await http.get<OrderRecord>(`${API_PREFIX}/orders/${orderId}`);
  },

  // 服务评价
  async submitReview(params: ServiceReviewParams): Promise<void> {
    console.log('[ServiceService] 提交评价:', params.orderId);
    await http.post(`${API_PREFIX}/orders/${params.orderId}/review`, params);
    Taro.showToast({ title: '评价成功', icon: 'success' });
  },

  // 申请退款
  async applyRefund(orderId: string, reason: string, amount?: number): Promise<void> {
    console.log('[ServiceService] 申请退款:', orderId);
    await http.post(`${API_PREFIX}/orders/${orderId}/refund`, { reason, amount });
    Taro.showToast({ title: '已提交退款申请', icon: 'success' });
  },

  // ============ 服务分类 ============

  // 获取服务分类
  async getServiceCategories(): Promise<Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    sort: number;
    children?: Array<{
      id: string;
      name: string;
      icon: string;
    }>;
  }>> {
    console.log('[ServiceService] 获取服务分类');
    return await http.get(`${API_PREFIX}/categories`);
  },

  // ============ 优惠券 ============

  // 获取可用优惠券
  async getAvailableCoupons(amount?: number, storeId?: string): Promise<Array<{
    id: string;
    name: string;
    type: 'discount' | 'fixed';
    value: number;
    minAmount: number;
    startTime: string;
    endTime: string;
    applicableStores?: string[];
    applicableServices?: string[];
  }>> {
    console.log('[ServiceService] 获取可用优惠券');
    return await http.get(`${API_PREFIX}/coupons/available`, { amount, storeId });
  },

  // ============ 状态文本映射 ============

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '待确认',
      'confirmed': '已确认',
      'processing': '服务中',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunded': '已退款'
    };
    return statusMap[status] || status;
  },

  getTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      'car_wash': '洗车',
      'maintenance': '保养',
      'repair': '维修',
      'rescue': '救援',
      'inspection': '年检',
      'violation': '违章代缴'
    };
    return typeMap[type] || type;
  },

  getPaymentStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'unpaid': '待支付',
      'paid': '已支付',
      'refunded': '已退款',
      'partial': '部分支付'
    };
    return statusMap[status] || status;
  }
};

export default serviceService;
