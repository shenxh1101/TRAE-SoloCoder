import { Router, type Request, type Response } from 'express'
import { authenticate } from '../middleware/auth'
import { reportService } from '../services/reportService'
import { successResponse, errorResponse } from '../utils/response'

const router = Router()

router.use(authenticate)

router.post('/generate/:taskId', async (req: Request, res: Response) => {
  try {
    const templateType = req.body.templateType || 'standard'
    const includeCharts = req.body.includeCharts !== false
    const includeRecommendations = req.body.includeRecommendations !== false

    const report = await reportService.generateReport({
      taskId: req.params.taskId,
      templateType: templateType as 'standard' | 'detailed' | 'brief',
      includeCharts,
      includeRecommendations,
    })

    if (!report) {
      return errorResponse(res, 'Failed to generate report', 500)
    }
    successResponse(res, report, 'Report generated successfully', 201)
  } catch (error) {
    errorResponse(res, 'Failed to generate report', 500)
  }
})

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = reportService.getStats()
    successResponse(res, stats)
  } catch (error) {
    errorResponse(res, 'Failed to fetch report stats', 500)
  }
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const reports = reportService.getAllReports()
    successResponse(res, reports)
  } catch (error) {
    errorResponse(res, 'Failed to fetch reports', 500)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const report = reportService.getReport(req.params.id)
    if (!report) {
      return errorResponse(res, 'Report not found', 404)
    }
    successResponse(res, report)
  } catch (error) {
    errorResponse(res, 'Failed to fetch report', 500)
  }
})

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const reportFile = reportService.getReportFile(req.params.id)
    if (!reportFile) {
      return errorResponse(res, 'Report file not found', 404)
    }

    const report = reportService.getReport(req.params.id)
    const filename = report ? `report-${report.taskId}.pdf` : 'report.pdf'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', reportFile.length)

    res.send(reportFile)
  } catch (error) {
    errorResponse(res, 'Failed to download report', 500)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = reportService.deleteReport(req.params.id)
    if (!deleted) {
      return errorResponse(res, 'Report not found', 404)
    }
    successResponse(res, null, 'Report deleted successfully')
  } catch (error) {
    errorResponse(res, 'Failed to delete report', 500)
  }
})

export default router
