import { Router, type Request, type Response } from 'express'
import { optionalAuth } from '../middleware/auth'
import { monitoringService } from '../services/monitoringService'
import { successResponse, errorResponse } from '../utils/response'

const router = Router()

router.use(optionalAuth)

router.get('/realtime/:taskId', async (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getCachedMetrics(req.params.taskId)
    if (!metrics) {
      return errorResponse(res, 'Metrics not found for this task', 404)
    }
    successResponse(res, metrics)
  } catch (error) {
    errorResponse(res, 'Failed to fetch realtime metrics', 500)
  }
})

router.get('/subscriptions', async (_req: Request, res: Response) => {
  try {
    const data = {
      activeTasks: monitoringService.getActiveTaskIds(),
      totalConnections: monitoringService.getTotalConnections(),
    }
    successResponse(res, data)
  } catch (error) {
    errorResponse(res, 'Failed to fetch subscription info', 500)
  }
})

router.get('/subscribers/:taskId', async (req: Request, res: Response) => {
  try {
    const count = monitoringService.getSubscribersCount(req.params.taskId)
    successResponse(res, { count })
  } catch (error) {
    errorResponse(res, 'Failed to fetch subscriber count', 500)
  }
})

export default router
