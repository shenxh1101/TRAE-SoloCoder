import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { BloodBag } from '../entities/BloodBag';
import { v4 as uuidv4 } from 'uuid';
import type { BloodType, BloodComponent, BloodBagStatus, TestReport } from '../types';

const router = Router();

interface CreateBloodBagRequest {
  bloodType: BloodType;
  component: BloodComponent;
  collectionDate: string;
  expiryDate: string;
  storageLocation: { shelf: number; row: number; column: number };
  volume: number;
  donorId: string;
  position3D: { x: number; y: number; z: number };
}

interface UpdateBloodBagRequest {
  bloodType?: BloodType;
  component?: BloodComponent;
  collectionDate?: string;
  expiryDate?: string;
  storageLocation?: { shelf: number; row: number; column: number };
  volume?: number;
  donorId?: string;
  position3D?: { x: number; y: number; z: number };
  status?: BloodBagStatus;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { bloodType, component, status } = req.query;
    const bloodBagRepository = AppDataSource.getRepository(BloodBag);

    const where: Record<string, any> = {};
    if (bloodType) where.bloodType = bloodType;
    if (component) where.component = component;
    if (status) where.status = status;

    const bloodBags = await bloodBagRepository.find({ where });

    res.json({
      success: true,
      data: bloodBags
    });
  } catch (error) {
    console.error('Get blood bags error:', error);
    res.status(500).json({
      success: false,
      error: '获取血袋列表失败'
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const bloodBag = await bloodBagRepository.findOne({ where: { id } });

    if (!bloodBag) {
      return res.status(404).json({
        success: false,
        error: '血袋不存在'
      });
    }

    res.json({
      success: true,
      data: bloodBag
    });
  } catch (error) {
    console.error('Get blood bag error:', error);
    res.status(500).json({
      success: false,
      error: '获取血袋详情失败'
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      bloodType,
      component,
      collectionDate,
      expiryDate,
      storageLocation,
      volume,
      donorId,
      position3D
    } = req.body as CreateBloodBagRequest;

    if (!bloodType || !component || !collectionDate || !expiryDate || !storageLocation || !volume || !donorId || !position3D) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const now = new Date().toISOString();

    const bloodBag = bloodBagRepository.create({
      id: uuidv4(),
      bloodType,
      component,
      collectionDate,
      expiryDate,
      storageLocation,
      volume,
      donorId,
      position3D,
      status: 'available',
      testReports: [],
      createdAt: now,
      updatedAt: now
    });

    await bloodBagRepository.save(bloodBag);

    res.json({
      success: true,
      data: bloodBag
    });
  } catch (error) {
    console.error('Create blood bag error:', error);
    res.status(500).json({
      success: false,
      error: '创建血袋失败'
    });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateBloodBagRequest;

    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const bloodBag = await bloodBagRepository.findOne({ where: { id } });

    if (!bloodBag) {
      return res.status(404).json({
        success: false,
        error: '血袋不存在'
      });
    }

    const updatedBloodBag = {
      ...bloodBag,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await bloodBagRepository.save(updatedBloodBag);

    res.json({
      success: true,
      data: updatedBloodBag
    });
  } catch (error) {
    console.error('Update blood bag error:', error);
    res.status(500).json({
      success: false,
      error: '更新血袋失败'
    });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const bloodBag = await bloodBagRepository.findOne({ where: { id } });

    if (!bloodBag) {
      return res.status(404).json({
        success: false,
        error: '血袋不存在'
      });
    }

    await bloodBagRepository.remove(bloodBag);

    res.json({
      success: true,
      data: {
        message: '血袋删除成功'
      }
    });
  } catch (error) {
    console.error('Delete blood bag error:', error);
    res.status(500).json({
      success: false,
      error: '删除血袋失败'
    });
  }
});

router.get('/:id/test-reports', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const bloodBag = await bloodBagRepository.findOne({ where: { id } });

    if (!bloodBag) {
      return res.status(404).json({
        success: false,
        error: '血袋不存在'
      });
    }

    res.json({
      success: true,
      data: bloodBag.testReports
    });
  } catch (error) {
    console.error('Get test reports error:', error);
    res.status(500).json({
      success: false,
      error: '获取检测报告失败'
    });
  }
});

router.post('/:id/test-reports', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hemoglobin, hematocrit, plateletCount, whiteBloodCellCount, ph } = req.body;

    if (hemoglobin === undefined || hematocrit === undefined || plateletCount === undefined || 
        whiteBloodCellCount === undefined || ph === undefined) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的检测参数'
      });
    }

    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const bloodBag = await bloodBagRepository.findOne({ where: { id } });

    if (!bloodBag) {
      return res.status(404).json({
        success: false,
        error: '血袋不存在'
      });
    }

    const isNormal = 
      hemoglobin >= 120 && hemoglobin <= 160 &&
      hematocrit >= 0.38 && hematocrit <= 0.50 &&
      plateletCount >= 150000 && plateletCount <= 450000 &&
      whiteBloodCellCount >= 4000 && whiteBloodCellCount <= 11000 &&
      ph >= 7.35 && ph <= 7.45;

    const testReport: TestReport = {
      id: uuidv4(),
      bloodBagId: id,
      testDate: new Date().toISOString(),
      hemoglobin,
      hematocrit,
      plateletCount,
      whiteBloodCellCount,
      ph,
      isNormal
    };

    bloodBag.testReports.push(testReport);
    bloodBag.updatedAt = new Date().toISOString();

    await bloodBagRepository.save(bloodBag);

    res.json({
      success: true,
      data: testReport
    });
  } catch (error) {
    console.error('Add test report error:', error);
    res.status(500).json({
      success: false,
      error: '添加检测报告失败'
    });
  }
});

export default router;
