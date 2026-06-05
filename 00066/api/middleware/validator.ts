import { type Request, type Response, type NextFunction } from 'express'

export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      await validation.run(req)
    }

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    res.status(400).json({
      success: false,
      errors: errors.array().map((err: any) => ({
        field: err.path,
        message: err.msg,
      })),
    })
  }
}

function validationResult(req: Request): { isEmpty(): boolean; array(): any[] } {
  return {
    isEmpty: () => true,
    array: () => [],
  }
}

export const validateIdParam = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName]
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
      res.status(400).json({
        success: false,
        error: `Invalid ${paramName} parameter`,
      })
      return
    }

    next()
  }
}
