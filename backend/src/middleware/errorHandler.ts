import { Request, Response, NextFunction } from 'express'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('错误:', err)

  res.status(500).json({
    error: err.message || '服务器内部错误',
  })
}

