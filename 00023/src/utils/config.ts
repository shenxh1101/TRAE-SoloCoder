import { PagodaConfig } from '@/types';

export const exportConfig = (config: PagodaConfig, filename: string = 'pagoda-config.json'): void => {
  try {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('Config exported:', filename);
  } catch (error) {
    console.error('Failed to export config:', error);
    alert('导出配置失败：' + (error as Error).message);
  }
};

export const importConfig = (file: File): Promise<PagodaConfig> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string) as PagodaConfig;
        if (validateConfig(config)) {
          resolve(config);
        } else {
          reject(new Error('配置文件格式无效，请检查文件内容'));
        }
      } catch (error) {
        reject(new Error('解析配置文件失败，请确保是有效的JSON文件'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file);
  });
};

export const validateConfig = (config: unknown): config is PagodaConfig => {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  if (typeof c.floors !== 'number' || c.floors < 3 || c.floors > 9) return false;
  if (typeof c.roofAngle !== 'number' || c.roofAngle < 0 || c.roofAngle > 45) return false;
  if (!['red', 'brown', 'gray'].includes(c.bodyColor as string)) return false;
  if (!['sharp', 'round', 'pearl'].includes(c.spireType as string)) return false;
  
  if (typeof c.sunPosition !== 'object' || c.sunPosition === null) return false;
  const sunPos = c.sunPosition as Record<string, unknown>;
  if (typeof sunPos.x !== 'number' || typeof sunPos.y !== 'number' || typeof sunPos.z !== 'number') return false;
  
  if (typeof c.shadowsEnabled !== 'boolean') return false;
  if (typeof c.gridHelper !== 'boolean') return false;
  if (typeof c.firefliesEnabled !== 'boolean') return false;
  
  return true;
};
