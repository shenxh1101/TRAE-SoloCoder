import { type Request, type Response, type NextFunction } from 'express'
import logger from '../utils/logger'

interface AppError extends Error {
  statusCode?: number
  code?: string
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
  })

  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal server error'

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413
    message = 'File too large'
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400
    message = 'Unexpected file field'
  }

  if (message.includes('not allowed')) {
    statusCode = 400
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export default errorHandler
