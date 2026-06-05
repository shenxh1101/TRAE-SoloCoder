import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Robot } from '../entities/Robot';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const robotRepository = AppDataSource.getRepository(Robot);
    const robots = await robotRepository.find();

    res.json({
      success: true,
      data: robots
    });
  } catch (error) {
    console.error('Get robots error:', error);
    res.status(500).json({
      success: false,
      error: '获取机器人列表失败'
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const robotRepository = AppDataSource.getRepository(Robot);
    const robot = await robotRepository.findOne({ where: { id } });

    if (!robot) {
      return res.status(404).json({
        success: false,
        error: '机器人不存在'
      });
    }

    res.json({
      success: true,
      data: robot
    });
  } catch (error) {
    console.error('Get robot error:', error);
    res.status(500).json({
      success: false,
      error: '获取机器人详情失败'
    });
  }
});

export default router;
