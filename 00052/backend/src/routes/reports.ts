import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { BloodBag } from '../entities/BloodBag';
import { TransfusionRequest } from '../entities/TransfusionRequest';
import { generateDailyReport, exportDailyReportToExcel } from '../utils/excelUtils';
import type { DailyReport } from '../types';

const router = Router();

router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const requestRepository = AppDataSource.getRepository(TransfusionRequest);

    const bloodBags = await bloodBagRepository.find();
    const requests = await requestRepository.find();

    const matchResults = requests
      .filter((req) => req.crossMatchResult)
      .map((req) => req.crossMatchResult!);

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
    }

    const report: DailyReport = generateDailyReport(bloodBags, matchResults, start, end, requests);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Generate daily report error:', error);
    res.status(500).json({
      success: false,
      error: '生成日报失败'
    });
  }
});

router.get('/daily/export', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const requestRepository = AppDataSource.getRepository(TransfusionRequest);

    const bloodBags = await bloodBagRepository.find();
    const requests = await requestRepository.find();

    const matchResults = requests
      .filter((req) => req.crossMatchResult)
      .map((req) => req.crossMatchResult!);

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
    }

    const report: DailyReport = generateDailyReport(bloodBags, matchResults, start, end, requests);
    const excelBuffer = exportDailyReportToExcel(report);

    const fileName = `日报_${report.reportDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', excelBuffer.length.toString());

    res.send(excelBuffer);
  } catch (error) {
    console.error('Export daily report error:', error);
    res.status(500).json({
      success: false,
      error: '导出日报失败'
    });
  }
});

export default router;
