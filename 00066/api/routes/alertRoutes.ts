import { Router, type Request, type Response } from 'express'
import { authenticate } from '../middleware/auth'
import { alertService } from '../services/alertService'
import { successResponse, errorResponse } from '../utils/response'

const router = Router()

router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string
    const level = req.query.level as string
    const taskId = req.query.taskId as string

    let alerts

    if (taskId) {
      alerts = alertService.getAlertsByTask(taskId)
    } else if (status) {
      alerts = alertService.getAlertsByStatus(status as any)
    } else if (level) {
      alerts = alertService.getAlertsByLevel(level as any)
    } else {
      alerts = alertService.getAllAlerts()
    }

    successResponse(res, alerts)
  } catch (error) {
    errorResponse(res, 'Failed to fetch alerts', 500)
  }
})

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = alertService.getStats()
    successResponse(res, stats)
  } catch (error) {
    errorResponse(res, 'Failed to fetch alert stats', 500)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const alert = alertService.getAlert(req.params.id)
    if (!alert) {
      return errorResponse(res, 'Alert not found', 404)
    }
    successResponse(res, alert)
  } catch (error) {
    errorResponse(res, 'Failed to fetch alert', 500)
  }
})

router.put('/:id/review', async (req: Request, res: Response) => {
  try {
    const updated = alertService.reviewAlert(
      req.params.id,
      req.user?.id,
      req.user?.username,
      req.body.decision,
      req.body.comment
    )
    if (!updated) {
      return errorResponse(res, 'Alert not found', 404)
    }
    successResponse(res, updated, 'Alert reviewed successfully')
  } catch (error: any) {
    if (error.name === 'AlertServiceError') {
      return errorResponse(res, error.message, 400)
    }
    errorResponse(res, 'Failed to review alert', 500)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = alertService.deleteAlert(req.params.id)
    if (!deleted) {
      return errorResponse(res, 'Alert not found', 404)
    }
    successResponse(res, null, 'Alert deleted successfully')
  } catch (error) {
    errorResponse(res, 'Failed to delete alert', 500)
  }
})

export default router
