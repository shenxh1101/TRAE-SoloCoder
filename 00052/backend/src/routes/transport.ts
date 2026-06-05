import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { TransfusionRequest } from '../entities/TransfusionRequest';
import { TransportTask } from '../entities/TransportTask';
import { Robot } from '../entities/Robot';
import { v4 as uuidv4 } from 'uuid';
import { findPath } from '../utils/pathfinding';
import { floorMap, worldToGrid, BLOOD_BANK_START, WARD_POSITIONS, NURSE_STATION } from '../utils/floorMap';
import type { RequestStatus, TransportStatus, Position3D } from '../types';

const router = Router();

router.post('/transfusion-requests/:id/create-transport', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const requestRepository = AppDataSource.getRepository(TransfusionRequest);
    const robotRepository = AppDataSource.getRepository(Robot);
    const taskRepository = AppDataSource.getRepository(TransportTask);

    const request = await requestRepository.findOne({ where: { id } });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: '输血申请不存在'
      });
    }

    if (request.status !== 'approved' && request.status !== 'cross_matched') {
      return res.status(400).json({
        success: false,
        error: '当前申请状态不允许创建运输任务'
      });
    }

    const availableRobot = await robotRepository.findOne({ where: { status: 'idle' } });

    if (!availableRobot) {
      return res.status(404).json({
        success: false,
        error: '没有可用的机器人'
      });
    }

    const wardKey = request.ward;
    const destinationPosition = WARD_POSITIONS[wardKey] || NURSE_STATION;

    const startGrid = worldToGrid(BLOOD_BANK_START.x, BLOOD_BANK_START.z);
    const endGrid = worldToGrid(destinationPosition.x, destinationPosition.z);

    const path = findPath(startGrid, endGrid, floorMap);

    if (path.length === 0) {
      return res.status(500).json({
        success: false,
        error: '无法找到可行路径'
      });
    }

    const now = new Date();
    const estimatedMinutes = Math.ceil(path.length * 0.5);
    const estimatedArrival = new Date(now.getTime() + estimatedMinutes * 60000);

    const bloodBagIds = request.crossMatchResult ? [request.crossMatchResult.bloodBagId] : [];

    const transportTask = taskRepository.create({
      id: uuidv4(),
      requestId: id,
      robotId: availableRobot.id,
      path,
      status: 'in_progress' as TransportStatus,
      startTime: now.toISOString(),
      estimatedArrival: estimatedArrival.toISOString(),
      currentPosition: path[0],
      progress: 0,
      bloodBagIds,
      destinationWard: request.ward
    });

    await taskRepository.save(transportTask);

    availableRobot.status = 'busy';
    availableRobot.currentTaskId = transportTask.id;
    availableRobot.currentPosition = path[0];
    await robotRepository.save(availableRobot);

    request.transportTask = transportTask;
    request.status = 'transporting' as RequestStatus;
    request.updatedAt = now.toISOString();
    await requestRepository.save(request);

    res.json({
      success: true,
      data: {
        task: transportTask,
        robot: availableRobot,
        path,
        estimatedArrival
      }
    });
  } catch (error) {
    console.error('Create transport task error:', error);
    res.status(500).json({
      success: false,
      error: '创建运输任务失败'
    });
  }
});

router.get('/transport-tasks', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const taskRepository = AppDataSource.getRepository(TransportTask);

    const where: Record<string, any> = {};
    if (status) where.status = status;

    const tasks = await taskRepository.find({
      where,
      order: { startTime: 'DESC' }
    });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get transport tasks error:', error);
    res.status(500).json({
      success: false,
      error: '获取运输任务列表失败'
    });
  }
});

router.get('/transport-tasks/:id', async (req: Request, res: Response) => {
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

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Get transport task error:', error);
    res.status(500).json({
      success: false,
      error: '获取运输任务详情失败'
    });
  }
});

router.post('/transport-tasks/:id/update-progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { progress, currentPosition } = req.body;

    if (progress === undefined || !currentPosition) {
      return res.status(400).json({
        success: false,
        error: '缺少进度或位置参数'
      });
    }

    const taskRepository = AppDataSource.getRepository(TransportTask);
    const robotRepository = AppDataSource.getRepository(Robot);

    const task = await taskRepository.findOne({ where: { id } });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '运输任务不存在'
      });
    }

    if (task.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: '任务状态不允许更新进度'
      });
    }

    task.progress = Math.min(100, Math.max(0, progress));
    task.currentPosition = currentPosition as Position3D;

    if (task.progress >= 100) {
      task.status = 'delivered' as TransportStatus;
    }

    await taskRepository.save(task);

    const robot = await robotRepository.findOne({ where: { id: task.robotId } });
    if (robot) {
      robot.currentPosition = currentPosition as Position3D;
      if (task.progress >= 100 && task.status === 'delivered') {
        robot.status = 'idle';
        robot.currentTaskId = null as any;
      }
      await robotRepository.save(robot);
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Update transport progress error:', error);
    res.status(500).json({
      success: false,
      error: '更新运输进度失败'
    });
  }
});

export default router;
