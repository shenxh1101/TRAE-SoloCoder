import { type Request, type Response } from 'express'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  pagination?: ApiResponse<T>['pagination']
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  }

  if (pagination) {
    response.pagination = pagination
  }

  res.status(statusCode).json(response)
}

export const errorResponse = (
  res: Response,
  errorMessage: string,
  statusCode: number = 400
): void => {
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  } as ApiResponse)
}

export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
): void => {
  const totalPages = Math.ceil(total / limit)

  successResponse(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages,
  })
}
