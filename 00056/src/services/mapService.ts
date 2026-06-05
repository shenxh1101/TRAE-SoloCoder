import Taro from '@tarojs/taro';
import { MAP_CONFIG, isDev } from '@/config/env';

// 位置坐标
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  altitude?: number;
  timestamp?: number;
}

// POI信息
export interface POIInfo {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  city?: string;
  province?: string;
}

// 地理编码结果
export interface GeocodeResult {
  formattedAddress: string;
  province: string;
  city: string;
  district: string;
  street: string;
  streetNumber: string;
  latitude: number;
  longitude: number;
  poiList?: POIInfo[];
}

// 地图服务提供商
export type MapProvider = 'amap' | 'baidu' | 'default';

// 坐标系统类型
export type CoordType = 'wgs84' | 'gcj02' | 'bd09';

// 位置权限状态
export type LocationAuthStatus = 'authorized' | 'denied' | 'not_determined' | 'restricted';

class MapService {
  private provider: MapProvider = MAP_CONFIG.provider as MapProvider;
  private amapKey: string = MAP_CONFIG.amapKey;
  private baiduKey: string = MAP_CONFIG.baiduKey;
  private amapSdkKey: string = MAP_CONFIG.amapSdkKey;
  private currentLocation: Location | null = null;
  private lastLocationTime: number = 0;
  private locationCacheExpire: number = 60000; // 位置缓存有效期60秒

  constructor() {
    this.initSdk();
  }

  // 初始化SDK（小程序端）
  private initSdk(): void {
    try {
      const env = Taro.getEnv();
      if (env === Taro.ENV_TYPE.WEAPP && this.amapSdkKey) {
        if (isDev) {
          console.log('[MapService] 小程序地图SDK初始化完成');
        }
      }
    } catch (error) {
      console.error('[MapService] SDK初始化失败:', error);
    }
  }

  // 获取当前位置
  async getCurrentLocation(
    enableHighAccuracy: boolean = true,
    cache: boolean = true
  ): Promise<Location> {
    const now = Date.now();

    if (cache && this.currentLocation && (now - this.lastLocationTime < this.locationCacheExpire)) {
      if (isDev) {
        console.log('[MapService] 使用缓存位置:', this.currentLocation);
      }
      return this.currentLocation;
    }

    try {
      const res = await Taro.getLocation({
        type: 'gcj02',
        isHighAccuracy: enableHighAccuracy,
        accuracy: 'best'
      });

      this.currentLocation = {
        latitude: res.latitude,
        longitude: res.longitude,
        accuracy: res.accuracy,
        speed: res.speed,
        altitude: res.altitude,
        timestamp: now
      };
      this.lastLocationTime = now;

      if (isDev) {
        console.log('[MapService] 获取位置成功:', this.currentLocation);
      }

      return this.currentLocation;
    } catch (error) {
      console.error('[MapService] 获取位置失败:', error);

      if ((error as any).errMsg?.includes('auth denied')) {
        Taro.showModal({
          title: '定位权限被拒绝',
          content: '请在设置中开启定位权限，以便使用地图和救援功能',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              Taro.openSetting();
            }
          }
        });
      }

      throw error;
    }
  }

  // 检查位置权限
  async checkLocationAuth(): Promise<LocationAuthStatus> {
    try {
      const res = await Taro.getSetting();
      const authStatus = res.authSetting['scope.userLocation'];

      if (authStatus === true) return 'authorized';
      if (authStatus === false) return 'denied';
      return 'not_determined';
    } catch (error) {
      console.error('[MapService] 检查权限失败:', error);
      return 'not_determined';
    }
  }

  // 请求位置权限
  async requestLocationAuth(): Promise<boolean> {
    try {
      const res = await Taro.authorize({
        scope: 'scope.userLocation'
      });
      return res.errMsg?.includes('ok') || false;
    } catch (error) {
      console.error('[MapService] 请求权限失败:', error);
      return false;
    }
  }

  // 逆地理编码（坐标转地址）- 高德地图
  async reverseGeocode(location: Location): Promise<GeocodeResult> {
    try {
      const url = `https://restapi.amap.com/v3/geocode/regeo?key=${this.amapKey}&location=${location.longitude},${location.latitude}&radius=1000&extensions=all`;

      const response = await Taro.request({
        url,
        method: 'GET'
      });

      const data = response.data as any;

      if (data.status === '1' && data.regeocode) {
        const component = data.regeocode.addressComponent;
        return {
          formattedAddress: data.regeocode.formatted_address,
          province: component.province,
          city: component.city || component.province,
          district: component.district,
          street: component.township || '',
          streetNumber: component.streetNumber?.street || '',
          latitude: location.latitude,
          longitude: location.longitude,
          poiList: data.regeocode.pois?.map((poi: any) => ({
            id: poi.id,
            name: poi.name,
            address: poi.address,
            latitude: parseFloat(poi.location.split(',')[1]),
            longitude: parseFloat(poi.location.split(',')[0]),
            distance: poi.distance
          })) || []
        };
      }

      throw new Error(data.info || '逆地理编码失败');
    } catch (error) {
      console.error('[MapService] 逆地理编码失败:', error);
      throw error;
    }
  }

  // 地理编码（地址转坐标）- 高德地图
  async geocode(address: string, city?: string): Promise<Location & { formattedAddress: string }> {
    try {
      let url = `https://restapi.amap.com/v3/geocode/geo?key=${this.amapKey}&address=${encodeURIComponent(address)}`;
      if (city) {
        url += `&city=${encodeURIComponent(city)}`;
      }

      const response = await Taro.request({ url, method: 'GET' });
      const data = response.data as any;

      if (data.status === '1' && data.geocodes?.length > 0) {
        const geo = data.geocodes[0];
        const [longitude, latitude] = geo.location.split(',').map(Number);
        return {
          latitude,
          longitude,
          formattedAddress: geo.formatted_address
        };
      }

      throw new Error(data.info || '地理编码失败');
    } catch (error) {
      console.error('[MapService] 地理编码失败:', error);
      throw error;
    }
  }

  // 周边POI搜索
  async searchNearbyPOI(
    keyword: string,
    location: Location,
    radius: number = 5000,
    page: number = 1,
    pageSize: number = 20
  ): Promise<POIInfo[]> {
    try {
      const url = `https://restapi.amap.com/v3/place/around?key=${this.amapKey}&location=${location.longitude},${location.latitude}&keywords=${encodeURIComponent(keyword)}&radius=${radius}&page=${page}&offset=${pageSize}&extensions=base`;

      const response = await Taro.request({ url, method: 'GET' });
      const data = response.data as any;

      if (data.status === '1' && data.pois) {
        return data.pois.map((poi: any) => ({
          id: poi.id,
          name: poi.name,
          address: poi.address,
          latitude: parseFloat(poi.location.split(',')[1]),
          longitude: parseFloat(poi.location.split(',')[0]),
          distance: poi.distance,
          city: poi.cityname,
          province: poi.pname
        }));
      }

      throw new Error(data.info || 'POI搜索失败');
    } catch (error) {
      console.error('[MapService] POI搜索失败:', error);
      throw error;
    }
  }

  // 计算两点之间的距离（米）
  getDistance(from: Location, to: Location): number {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRad(to.latitude - from.latitude);
    const dLon = this.toRad(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.latitude)) * Math.cos(this.toRad(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  // 格式化距离显示
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  // 打开地图导航
  async openMapNavigation(
    destination: Location & { name: string; address?: string },
    source?: Location
  ): Promise<void> {
    try {
      const from = source || this.currentLocation;

      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        await Taro.openLocation({
          latitude: destination.latitude,
          longitude: destination.longitude,
          name: destination.name,
          address: destination.address || '',
          scale: 18
        });
      } else {
        const url = this.getMapNavigationUrl(from, destination);
        Taro.setClipboardData({ data: destination.address || destination.name });
        Taro.showModal({
          title: '导航已复制',
          content: '目的地已复制到剪贴板，请在地图APP中粘贴导航',
          showCancel: false
        });
      }
    } catch (error) {
      console.error('[MapService] 打开导航失败:', error);
      throw error;
    }
  }

  // 获取地图导航链接
  private getMapNavigationUrl(
    from: Location | undefined,
    to: Location & { name: string; address?: string }
  ): string {
    if (this.provider === 'amap') {
      let url = `https://uri.amap.com/navigation?to=${to.longitude},${to.latitude},${encodeURIComponent(to.name)}&mode=car&policy=1&src=chehuda&coordinate=gaode`;
      if (from) {
        url += `&from=${from.longitude},${from.latitude},我的位置`;
      }
      return url;
    } else {
      let url = `http://api.map.baidu.com/direction?origin=${from ? `${from.latitude},${from.longitude}` : ''}&destination=${to.latitude},${to.longitude}&mode=driving&region=全国&output=html&src=chehuda`;
      return url;
    }
  }

  // 坐标转换
  convertCoord(location: Location, from: CoordType, to: CoordType): Location {
    const x_PI = (3.14159265358979324 * 3000.0) / 180.0;
    const PI = 3.1415926535897932384626;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;

    let { latitude: lat, longitude: lng } = location;

    // WGS84 转 GCJ02
    if (from === 'wgs84' && to === 'gcj02') {
      if (this.outOfChina(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }

      let dlat = this.transformLat(lng - 105.0, lat - 35.0);
      let dlng = this.transformLng(lng - 105.0, lat - 35.0);
      const radlat = (lat / 180.0) * PI;
      let magic = Math.sin(radlat);
      magic = 1 - ee * magic * magic;
      const sqrtmagic = Math.sqrt(magic);
      dlat = (dlat * 180.0) / (((a * (1 - ee)) / (magic * sqrtmagic)) * PI);
      dlng = (dlng * 180.0) / ((a / sqrtmagic) * Math.cos(radlat) * PI);
      const mglat = lat + dlat;
      const mglng = lng + dlng;
      return { latitude: mglat, longitude: mglng };
    }

    // GCJ02 转 BD09
    if (from === 'gcj02' && to === 'bd09') {
      const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_PI);
      const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_PI);
      const bd_lng = z * Math.cos(theta) + 0.0065;
      const bd_lat = z * Math.sin(theta) + 0.006;
      return { latitude: bd_lat, longitude: bd_lng };
    }

    // BD09 转 GCJ02
    if (from === 'bd09' && to === 'gcj02') {
      const x = lng - 0.0065;
      const y = lat - 0.006;
      const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_PI);
      const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_PI);
      const gg_lng = z * Math.cos(theta);
      const gg_lat = z * Math.sin(theta);
      return { latitude: gg_lat, longitude: gg_lng };
    }

    return { latitude: lat, longitude: lng };
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private outOfChina(lat: number, lng: number): boolean {
    return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
  }

  private transformLat(x: number, y: number): number {
    const PI = 3.1415926535897932384626;
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
    return ret;
  }

  private transformLng(x: number, y: number): number {
    const PI = 3.1415926535897932384626;
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
    return ret;
  }

  // 清理缓存
  clearCache(): void {
    this.currentLocation = null;
    this.lastLocationTime = 0;
  }
}

export const mapService = new MapService();
export default mapService;
