import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { TransfusionRequest } from '../entities/TransfusionRequest';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import type { RequestStatus, ApprovalDecision, ApprovalRecord, UserRole } from '../types';

const router = Router();

interface ApproveRequest {
  decision: ApprovalDecision;
  comments?: string;
}

const APPROVAL_LEVELS: Record<UserRole, number> = {
  'doctor': 1,
  'department_director': 2,
  'blood_bank_director': 3,
  'nurse': 0,
  'admin': 0
};

const STATUS_TRANSITIONS: Record<number, RequestStatus> = {
  1: 'doctor_approved',
  2: 'director_approved',
  3: 'approved'
};

const CAN_APPROVE_STATUS: Record<number, RequestStatus[]> = {
  1: ['pending'],
  2: ['doctor_approved'],
  3: ['director_approved']
};

router.post('/transfusion-requests/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, comments } = req.body as ApproveRequest;

    if (!decision) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: '审批决策无效，必须是 approved 或 rejected'
      });
    }

    const requestRepository = AppDataSource.getRepository(TransfusionRequest);
    const userRepository = AppDataSource.getRepository(User);

    const request = await requestRepository.findOne({ where: { id } });
    const approver = await userRepository.findOne({ where: { id: req.user?.id } });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: '输血申请不存在'
      });
    }

    if (!approver) {
      return res.status(404).json({
        success: false,
        error: '审批人不存在'
      });
    }

    const approvalLevel = APPROVAL_LEVELS[approver.role];

    if (approvalLevel === 0) {
      return res.status(403).json({
        success: false,
        error: '当前用户没有审批权限'
      });
    }

    const canApproveStatuses = CAN_APPROVE_STATUS[approvalLevel];
    if (!canApproveStatuses.includes(request.status)) {
      return res.status(400).json({
        success: false,
        error: `当前申请状态不允许该级别审批，当前状态: ${request.status}`
      });
    }

    const approvalRecord: ApprovalRecord = {
      id: uuidv4(),
      requestId: id,
      approverId: approver.id,
      approverName: approver.name,
      approverRole: approver.role,
      decision,
      comments,
      approvedAt: new Date().toISOString(),
      approvalLevel
    };

    request.approvalRecords.push(approvalRecord);

    if (decision === 'rejected') {
      request.status = 'rejected' as RequestStatus;
    } else {
      const nextStatus = STATUS_TRANSITIONS[approvalLevel];
      if (nextStatus) {
        request.status = nextStatus;
      }
    }

    request.updatedAt = new Date().toISOString();
    await requestRepository.save(request);

    res.json({
      success: true,
      data: {
        request,
        approvalRecord
      }
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({
      success: false,
      error: '审批失败'
    });
  }
});

export default router;
