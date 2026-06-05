import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { validationResult } from 'express-validator';

import authRoutes from './routes/auth';
import examRoutes from './routes/exams';
import gradingRoutes from './routes/grading';
import anomalyRoutes from './routes/anomalies';
import makeupRoutes from './routes/makeup';
import notificationRoutes from './routes/notifications';
import exportRoutes from './routes/export';

import { errorHandler, notFoundHandler, AppError } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/makeup', makeupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);

app.use('/api/docs', (req: Request, res: Response) => {
  res.json({
    title: '在线考试与成绩管理系统 API',
    version: '1.0.0',
    endpoints: {
      auth: [
        'POST /api/auth/login - 用户登录',
        'GET /api/auth/me - 获取当前用户信息',
        'PUT /api/auth/password - 修改密码',
      ],
      exams: [
        'POST /api/exams - 教师创建考试',
        'GET /api/exams/my - 获取我的考试列表',
        'GET /api/exams/:examId - 获取考试详情',
        'GET /api/exams/:examId/paper - 获取考生试卷',
        'PUT /api/exams/:examId/publish - 发布考试',
        'PUT /api/exams/:examId/start - 开始考试',
        'PUT /api/exams/:examId/end - 结束考试',
        'POST /api/exams/:examId/statistics - 计算考试统计',
        'GET /api/exams/:examId/statistics - 获取考试统计',
        'GET /api/exams/:examId/distribution - 获取分数分布',
        'POST /api/exams/papers/:paperId/answers - 提交答案',
        'PUT /api/exams/papers/:paperId/submit - 提交试卷',
      ],
      grading: [
        'GET /api/grading/pending - 获取待评阅列表',
        'PUT /api/grading/answers/:answerId/grade - 评阅主观题',
        'PUT /api/grading/papers/:paperId/finalize - 计算最终成绩',
      ],
      anomalies: [
        'GET /api/anomalies - 获取异常成绩列表',
        'PUT /api/anomalies/:anomalyId/review - 审核异常成绩',
        'GET /api/anomalies/my-scores - 获取我的历史成绩',
      ],
      makeup: [
        'POST /api/makeup - 申请补考',
        'GET /api/makeup/my - 获取我的补考申请',
        'PUT /api/makeup/:makeupId/approve - 批准补考',
        'PUT /api/makeup/:makeupId/reject - 拒绝补考',
      ],
      notifications: [
        'GET /api/notifications - 获取通知列表',
        'PUT /api/notifications/:notificationId/read - 标记已读',
        'PUT /api/notifications/read-all - 全部标记已读',
      ],
      export: [
        'GET /api/export/class/:classId/scores - 导出班级成绩单',
        'GET /api/export/course/:courseId/analysis - 导出试卷质量分析',
      ],
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
