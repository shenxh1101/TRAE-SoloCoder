import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { TransportTask } from '../entities/TransportTask';
import { TransfusionRequest } from '../entities/TransfusionRequest';
import { BloodBag } from '../entities/BloodBag';
import { v4 as uuidv4 } from 'uuid';
import type { NurseConfirmation, TransportStatus, RequestStatus, BloodBagStatus } from '../types';

const router = Router();

interface ConfirmReceiveRequest {
  nurseName: string;
  qrCode: string;
}

let generatedQrCodes: Record<string, string> = {};

router.post('/transport-tasks/:id/scan-qr', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const taskRepository = AppDataSource.getRepository(TransportTask);

    const task = await taskRepository.findOne({ where: { id } });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '运输任务不存在'
      });
    }

    if (task.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: '任务尚未送达，无法扫码'
      });
    }

    const qrCode = `QR-${uuidv4().slice(0, 8).toUpperCase()}`;
    generatedQrCodes[id] = qrCode;

    setTimeout(() => {
      delete generatedQrCodes[id];
    }, 5 * 60 * 1000);

    res.json({
      success: true,
      data: {
        qrCode,
        taskId: id,
        bloodBagIds: task.bloodBagIds,
        expiresIn: 300
      }
    });
  } catch (error) {
    console.error('Scan QR code error:', error);
    res.status(500).json({
      success: false,
      error: '扫码失败'
    });
  }
});

router.post('/transport-tasks/:id/confirm-receive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nurseName, qrCode } = req.body as ConfirmReceiveRequest;

    if (!nurseName || !qrCode) {
      return res.status(400).json({
        success: false,
        error: '缺少护士姓名或QR码'
      });
    }

    const taskRepository = AppDataSource.getRepository(TransportTask);
    const requestRepository = AppDataSource.getRepository(TransfusionRequest);
    const bloodBagRepository = AppDataSource.getRepository(BloodBag);

    const task = await taskRepository.findOne({ where: { id } });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '运输任务不存在'
      });
    }

    if (task.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: '任务尚未送达，无法签收'
      });
    }

    const expectedQrCode = generatedQrCodes[id];
    if (!expectedQrCode || expectedQrCode !== qrCode) {
      return res.status(400).json({
        success: false,
        error: 'QR码无效或已过期'
      });
    }

    const now = new Date();
    const estimatedArrival = new Date(task.estimatedArrival);
    const timeDiff = now.getTime() - estimatedArrival.getTime();
    const isOverdue = timeDiff > 5 * 60 * 1000;

    const nurseConfirmation: NurseConfirmation = {
      id: uuidv4(),
      taskId: id,
      nurseName,
      confirmedAt: now.toISOString(),
      qrCode,
      isOverdue
    };

    task.nurseConfirmation = nurseConfirmation;
    task.status = 'delivered' as TransportStatus;
    await taskRepository.save(task);

    delete generatedQrCodes[id];

    const request = await requestRepository.findOne({ where: { id: task.requestId } });
    if (request) {
      request.status = 'completed' as RequestStatus;
      request.updatedAt = now.toISOString();
      if (request.transportTask) {
        request.transportTask.nurseConfirmation = nurseConfirmation;
        request.transportTask.status = 'delivered' as TransportStatus;
      }
      await requestRepository.save(request);
    }

    if (task.bloodBagIds && task.bloodBagIds.length > 0) {
      for (const bagId of task.bloodBagIds) {
        const bloodBag = await bloodBagRepository.findOne({ where: { id: bagId } });
        if (bloodBag) {
          bloodBag.status = 'used' as BloodBagStatus;
          bloodBag.updatedAt = now.toISOString();
          await bloodBagRepository.save(bloodBag);
        }
      }
    }

    res.json({
      success: true,
      data: {
        nurseConfirmation,
        task,
        isOverdue
      }
    });
  } catch (error) {
    console.error('Confirm receive error:', error);
    res.status(500).json({
      success: false,
      error: '签收确认失败'
    });
  }
});

export default router;
