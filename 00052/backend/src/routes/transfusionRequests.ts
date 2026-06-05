import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { TransfusionRequest } from '../entities/TransfusionRequest';
import { BloodBag } from '../entities/BloodBag';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import { crossMatch, findCompatibleBloodBags } from '../utils/bloodTypeUtils';
import { authMiddleware } from '../middleware/auth';
import type { BloodType, BloodComponent, RequestStatus, CrossMatchResult, MatchResult } from '../types';

const router = Router();

interface CreateTransfusionRequest {
  patientId: string;
  bloodType: BloodType;
  component: BloodComponent;
  volume: number;
  urgency: 'routine' | 'urgent' | 'emergency';
  reason?: string;
  diagnosis?: string;
  doctorNotes?: string;
  ward?: string;
  bedNumber?: string;
  requestingDoctor?: string;
  department?: string;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const requestRepository = AppDataSource.getRepository(TransfusionRequest);

    const where: Record<string, any> = {};
    if (status) where.status = status;

    const requests = await requestRepository.find({
      where,
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get transfusion requests error:', error);
    res.status(500).json({
      success: false,
      error: '获取输血申请列表失败'
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestRepository = AppDataSource.getRepository(TransfusionRequest);
    const request = await requestRepository.findOne({ where: { id } });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: '输血申请不存在'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Get transfusion request error:', error);
    res.status(500).json({
      success: false,
      error: '获取输血申请详情失败'
    });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      bloodType,
      component,
      volume,
      urgency,
      reason,
      diagnosis,
      doctorNotes,
      ward,
      bedNumber,
      requestingDoctor,
      department
    } = req.body as CreateTransfusionRequest;

    if (!patientId || !bloodType || !component || !volume || !urgency) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.user?.id } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }

    const requestRepository = AppDataSource.getRepository(TransfusionRequest);
    const now = new Date().toISOString();

    const request = requestRepository.create({
      id: uuidv4(),
      patientId,
      bloodType,
      component,
      volume: Number(volume),
      urgency,
      reason: reason || diagnosis || doctorNotes || '输血治疗',
      requesterId: user.id,
      requesterName: requestingDoctor || user.name,
      department: department || user.department || '未指定科室',
      ward: ward || '普通病房',
      bedNumber: bedNumber || '未分配',
      status: 'pending' as RequestStatus,
      approvalRecords: [],
      createdAt: now,
      updatedAt: now
    });

    await requestRepository.save(request);

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Create transfusion request error:', error);
    res.status(500).json({
      success: false,
      error: '创建输血申请失败'
    });
  }
});

router.post('/:id/cross-match', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { performedBy } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.user?.id } });
    const operatorName = performedBy || user?.name || '系统';

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }

    const requestRepository = AppDataSource.getRepository(TransfusionRequest);
    const bloodBagRepository = AppDataSource.getRepository(BloodBag);

    const request = await requestRepository.findOne({ where: { id } });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: '输血申请不存在'
      });
    }

    if (request.status !== 'pending' && request.status !== 'doctor_approved' && 
        request.status !== 'director_approved' && request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: '当前申请状态不允许执行交叉配血'
      });
    }

    const allBloodBags = await bloodBagRepository.find({ where: { status: 'available' } });
    const compatibleBags = findCompatibleBloodBags(
      request.bloodType,
      request.component,
      allBloodBags
    );

    if (compatibleBags.length === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到相容的血袋'
      });
    }

    const selectedBag = compatibleBags[0];
    const matchResult: MatchResult = crossMatch(request.bloodType, selectedBag);

    const crossMatchResult: CrossMatchResult = {
      id: uuidv4(),
      requestId: id,
      bloodBagId: selectedBag.id,
      patientId: request.patientId,
      matchResult,
      crossMatchDate: new Date().toISOString(),
      performedBy: operatorName,
      remarks: matchResult === 'compatible' ? '配血成功' : '配血失败'
    };

    if (matchResult === 'compatible') {
      request.crossMatchResult = crossMatchResult;
      request.status = 'cross_matched' as RequestStatus;
      request.updatedAt = new Date().toISOString();

      selectedBag.status = 'allocated';
      selectedBag.updatedAt = new Date().toISOString();
      await bloodBagRepository.save(selectedBag);
    } else {
      request.crossMatchResult = crossMatchResult;
      request.updatedAt = new Date().toISOString();
    }

    await requestRepository.save(request);

    res.json({
      success: true,
      data: {
        crossMatchResult,
        bloodBag: selectedBag,
        isCompatible: matchResult === 'compatible'
      }
    });
  } catch (error) {
    console.error('Cross match error:', error);
    res.status(500).json({
      success: false,
      error: '交叉配血失败'
    });
  }
});

export default router;
