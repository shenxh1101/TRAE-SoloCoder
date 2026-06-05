import { Router, type Request, type Response } from 'express'
import { authenticate } from '../middleware/auth'
import { taskService } from '../services/taskService'
import { bemService } from '../services/bemService'
import { successResponse, errorResponse } from '../utils/response'

const router = Router()

router.use(authenticate)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const tasks = taskService.getAllTasks()
    successResponse(res, tasks)
  } catch (error) {
    errorResponse(res, 'Failed to fetch tasks', 500)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = taskService.getTask(req.params.id)
    if (!task) {
      return errorResponse(res, 'Task not found', 404)
    }
    successResponse(res, task)
  } catch (error) {
    errorResponse(res, 'Failed to fetch task', 500)
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const task = taskService.createTask({
      ...req.body,
      creatorId: req.user?.id,
      creatorName: req.user?.username,
    })
    successResponse(res, task, 'Task created successfully', 201)
  } catch (error) {
    errorResponse(res, 'Failed to create task', 500)
  }
})

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const task = await taskService.transitionStatus(
      req.params.id,
      req.body.status,
      (req.user?.role || 'engineer') as any,
      req.body.errorMessage
    )
    successResponse(res, task, 'Task status updated')
  } catch (error: any) {
    if (error.name === 'TaskNotFoundError') {
      return errorResponse(res, error.message, 404)
    }
    if (error.name === 'TaskStateMachineError') {
      return errorResponse(res, error.message, 400)
    }
    errorResponse(res, 'Failed to update task status', 500)
  }
})

router.put('/:id/progress', async (req: Request, res: Response) => {
  try {
    const task = taskService.updateProgress(req.params.id, req.body.progressPercent)
    if (!task) {
      return errorResponse(res, 'Task not found', 404)
    }
    successResponse(res, task, 'Task progress updated')
  } catch (error) {
    errorResponse(res, 'Failed to update task progress', 500)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = taskService.deleteTask(req.params.id)
    if (!deleted) {
      return errorResponse(res, 'Task not found', 404)
    }
    successResponse(res, null, 'Task deleted successfully')
  } catch (error) {
    errorResponse(res, 'Failed to delete task', 500)
  }
})

router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const task = taskService.getTask(req.params.id)
    if (!task) {
      return errorResponse(res, 'Task not found', 404)
    }

    if (task.status !== 'pending') {
      return errorResponse(res, `Task must be in 'pending' status to start calculation. Current status: ${task.status}`, 400)
    }

    const roomDimensions = req.body.roomDimensions || { length: 10, width: 8, height: 3 }

    res.status(202).json({
      success: true,
      message: 'BEM calculation started',
      taskId: task.id,
    })

    setImmediate(async () => {
      try {
        const result = await bemService.startCalculation({
          taskId: task.id,
          roomDimensions,
          sourceParameters: task.sourceParameters,
        })

        taskService.setCalculationResult(task.id, result)
        console.log(`[TaskRoutes] BEM calculation completed for task ${task.id}`)
      } catch (error) {
        console.error(`[TaskRoutes] BEM calculation failed for task ${task.id}:`, error)
        try {
          await taskService.transitionStatus(task.id, 'abnormal', 'engineer', error instanceof Error ? error.message : 'Unknown error')
        } catch (transitionError) {
          console.error(`[TaskRoutes] Failed to mark task ${task.id} as abnormal:`, transitionError)
        }
      }
    })
  } catch (error: any) {
    errorResponse(res, error.message || 'Failed to start BEM calculation', 500)
  }
})

router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const result = taskService.getCalculationResult(req.params.id)
    if (!result) {
      return errorResponse(res, 'Calculation results not found for this task', 404)
    }
    successResponse(res, result)
  } catch (error) {
    errorResponse(res, 'Failed to fetch calculation results', 500)
  }
})

export default router
