import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { MIN_TEMP, MAX_TEMP } from '../config';
import { InventoryAlert } from '../entities/InventoryAlert';
import { SystemAlert } from '../entities/SystemAlert';
import { ColdStorage } from '../entities/ColdStorage';
import { BloodBag } from '../entities/BloodBag';
import { v4 as uuidv4 } from 'uuid';
import { getInventorySeverity, getDaysOfSupply, DAILY_USAGE_THRESHOLDS } from '../utils/bloodTypeUtils';
import type { BloodType, BloodComponent, AlertSeverity, AlertType } from '../types';

const router = Router();

router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const alertRepository = AppDataSource.getRepository(InventoryAlert);
    const bloodBagRepository = AppDataSource.getRepository(BloodBag);

    const bloodBags = await bloodBagRepository.find();
    const bloodTypes: BloodType[] = ['A', 'B', 'AB', 'O'];
    const components: BloodComponent[] = ['whole_blood', 'plasma', 'platelet'];

    const alerts: InventoryAlert[] = [];

    for (const bloodType of bloodTypes) {
      for (const component of components) {
        const availableBags = bloodBags.filter(
          (bag) => bag.bloodType === bloodType && 
                   bag.component === component && 
                   bag.status === 'available'
        );

        const available = availableBags.length;
        const threshold = DAILY_USAGE_THRESHOLDS[bloodType][component] * 3;
        const daysOfSupply = getDaysOfSupply(bloodType, component, available);
        const severity = getInventorySeverity(bloodType, component, available);

        if (severity !== 'normal') {
          const existingAlert = await alertRepository.findOne({
            where: {
              bloodType,
              component,
              acknowledged: false
            }
          });

          if (!existingAlert) {
            const alert = alertRepository.create({
              id: uuidv4(),
              bloodType,
              component,
              currentStock: available,
              threshold,
              daysOfSupply,
              severity: severity as AlertSeverity,
              acknowledged: false,
              createdAt: new Date().toISOString()
            });
            await alertRepository.save(alert);
            alerts.push(alert);
          } else {
            existingAlert.currentStock = available;
            existingAlert.threshold = threshold;
            existingAlert.daysOfSupply = daysOfSupply;
            existingAlert.severity = severity as AlertSeverity;
            await alertRepository.save(existingAlert);
            alerts.push(existingAlert);
          }
        }
      }
    }

    const allAlerts = await alertRepository.find({
      where: { acknowledged: false },
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      data: allAlerts
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({
      success: false,
      error: '获取库存预警失败'
    });
  }
});

router.get('/system', async (req: Request, res: Response) => {
  try {
    const alertRepository = AppDataSource.getRepository(SystemAlert);

    const alerts = await alertRepository.find({
      where: { acknowledged: false },
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Get system alerts error:', error);
    res.status(500).json({
      success: false,
      error: '获取系统预警失败'
    });
  }
});

router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inventoryAlertRepository = AppDataSource.getRepository(InventoryAlert);
    const systemAlertRepository = AppDataSource.getRepository(SystemAlert);

    let alert = await inventoryAlertRepository.findOne({ where: { id } });
    let isInventoryAlert = true;

    if (!alert) {
      const systemAlert = await systemAlertRepository.findOne({ where: { id } });
      if (systemAlert) {
        alert = systemAlert as any;
        isInventoryAlert = false;
      }
    }

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: '预警不存在'
      });
    }

    alert.acknowledged = true;

    if (isInventoryAlert) {
      await inventoryAlertRepository.save(alert);
    } else {
      await systemAlertRepository.save(alert as any);
    }

    res.json({
      success: true,
      data: {
        message: '预警已确认',
        alert
      }
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: '确认预警失败'
    });
  }
});

router.get('/cold-storage', async (req: Request, res: Response) => {
  try {
    const coldStorageRepository = AppDataSource.getRepository(ColdStorage);
    const coldStorages = await coldStorageRepository.find();

    res.json({
      success: true,
      data: coldStorages
    });
  } catch (error) {
    console.error('Get cold storage error:', error);
    res.status(500).json({
      success: false,
      error: '获取冷库状态失败'
    });
  }
});

router.post('/cold-storage/temperature', async (req: Request, res: Response) => {
  try {
    const { id, temperature } = req.body;

    if (!id || temperature === undefined) {
      return res.status(400).json({
        success: false,
        error: '缺少冷库ID或温度参数'
      });
    }

    const coldStorageRepository = AppDataSource.getRepository(ColdStorage);
    const systemAlertRepository = AppDataSource.getRepository(SystemAlert);

    const coldStorage = await coldStorageRepository.findOne({ where: { id } });

    if (!coldStorage) {
      return res.status(404).json({
        success: false,
        error: '冷库不存在'
      });
    }

    coldStorage.currentTemperature = temperature;
    coldStorage.lastUpdate = new Date().toISOString();

    const minTemp = coldStorage.minTemperature || MIN_TEMP;
    const maxTemp = coldStorage.maxTemperature || MAX_TEMP;

    if (temperature < minTemp || temperature > maxTemp) {
      coldStorage.status = temperature > maxTemp ? 'critical' : 'warning';
      coldStorage.isBackupCoolingActive = temperature > maxTemp;

      const existingAlert = await systemAlertRepository.findOne({
        where: {
          type: 'temperature' as AlertType,
          acknowledged: false
        }
      });

      if (!existingAlert) {
        const alert = systemAlertRepository.create({
          id: uuidv4(),
          type: 'temperature' as AlertType,
          severity: temperature > maxTemp ? 'critical' : 'high' as AlertSeverity,
          title: '冷库温度异常',
          message: `${coldStorage.name}温度${temperature}°C超出正常范围(${minTemp}°C-${maxTemp}°C)`,
          acknowledged: false,
          createdAt: new Date().toISOString(),
          details: {
            coldStorageId: id,
            temperature,
            minTemp,
            maxTemp
          }
        });
        await systemAlertRepository.save(alert);
      }
    } else {
      coldStorage.status = 'normal';
      coldStorage.isBackupCoolingActive = false;
    }

    await coldStorageRepository.save(coldStorage);

    res.json({
      success: true,
      data: coldStorage
    });
  } catch (error) {
    console.error('Update temperature error:', error);
    res.status(500).json({
      success: false,
      error: '更新温度失败'
    });
  }
});

export default router;
