import { Router, type Request, type Response } from 'express'
import { authenticate } from '../middleware/auth'
import { recommendationService } from '../services/recommendationService'
import { successResponse, errorResponse } from '../utils/response'
import type { Room, PurposeCategory, RoomDimensions } from '../../src/types/index'

const router = Router()

router.use(authenticate)

router.get('/room/:roomId', async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId
    
    const mockRoom: Room = {
      id: roomId,
      name: '模拟房间',
      dimensions: { length: 10, width: 8, height: 3 } as RoomDimensions,
      volumeM3: 240,
      surfaceAreaM2: 268,
      purposeCategory: 'office' as PurposeCategory,
      singularCount: 0,
      isSuspended: false,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
    }

    const { extractRoomFeatures } = await import('../services/recommendationService')
    const roomFeatures = extractRoomFeatures(mockRoom)
    
    const recommendations = await recommendationService.recommendMaterials({
      roomId,
      roomFeatures,
      topK: 5,
    })
    
    successResponse(res, recommendations)
  } catch (error) {
    errorResponse(res, 'Failed to fetch recommendations', 500)
  }
})

router.post('/generate/:roomId', async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId
    const { roomData } = req.body

    const mockRoom: Room = roomData || {
      id: roomId,
      name: '模拟房间',
      dimensions: { length: 10, width: 8, height: 3 } as RoomDimensions,
      volumeM3: 240,
      surfaceAreaM2: 268,
      purposeCategory: 'office' as PurposeCategory,
      singularCount: 0,
      isSuspended: false,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
    }

    const { extractRoomFeatures } = await import('../services/recommendationService')
    const roomFeatures = extractRoomFeatures(mockRoom)
    
    const recommendations = await recommendationService.recommendMaterials({
      roomId,
      roomFeatures,
      topK: 5,
    })
    
    successResponse(res, recommendations, 'Recommendations generated successfully', 201)
  } catch (error) {
    errorResponse(res, 'Failed to generate recommendation', 500)
  }
})

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = recommendationService.getHistoryStats()
    successResponse(res, stats)
  } catch (error) {
    errorResponse(res, 'Failed to fetch recommendation stats', 500)
  }
})

router.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const recommendation = recommendationService.getRecommendation(req.params.id)
    if (!recommendation) {
      return errorResponse(res, 'Recommendation not found', 404)
    }
    successResponse(res, recommendation, 'Recommendation applied successfully')
  } catch (error) {
    errorResponse(res, 'Failed to apply recommendation', 500)
  }
})

export default router
