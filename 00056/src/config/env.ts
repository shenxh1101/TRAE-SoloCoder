// 环境变量配置
// 根据不同运行环境切换API地址

export const ENV = process.env.TARO_ENV || 'h5';

export const isDev = process.env.NODE_ENV === 'development';
export const isProd = process.env.NODE_ENV === 'production';

// API基础域名
export const API_BASE_URL = isDev
  ? 'http://localhost:3000'
  : 'https://api.chehuda.com';

// 第三方服务配置
export const MAP_CONFIG = {
  provider: 'amap', // amap: 高德, baidu: 百度
  amapKey: 'your_amap_web_key_here',
  baiduKey: 'your_baidu_map_key_here',
  amapSdkKey: 'your_amap_sdk_key_here' // 小程序SDK Key
};

// 第三方违章查询API
export const VIOLATION_API_CONFIG = {
  url: 'https://third-party-violation-api.com',
  appKey: 'your_violation_app_key',
  appSecret: 'your_violation_app_secret'
};

// 保险服务API
export const INSURANCE_API_CONFIG = {
  url: 'https://third-party-insurance-api.com',
  appKey: 'your_insurance_app_key'
};

// WebSocket配置
export const WS_CONFIG = {
  url: isDev ? 'ws://localhost:3000' : 'wss://ws.chehuda.com',
  heartbeatInterval: 30000, // 心跳间隔30秒
  reconnectInterval: 5000, // 重连间隔5秒
  maxReconnectTimes: 10 // 最大重连次数
};

// 文件上传配置
export const UPLOAD_CONFIG = {
  url: `${API_BASE_URL}/upload`,
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
};

export default {
  ENV,
  isDev,
  isProd,
  API_BASE_URL,
  MAP_CONFIG,
  VIOLATION_API_CONFIG,
  INSURANCE_API_CONFIG,
  WS_CONFIG,
  UPLOAD_CONFIG
};
