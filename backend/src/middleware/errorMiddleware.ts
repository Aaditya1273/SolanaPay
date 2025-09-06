import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

export interface ApiError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`) as ApiError
  error.statusCode = 404
  next(error)
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500
  let message = err.message

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = 'Resource not found'
    statusCode = 404
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    message = 'Duplicate field value entered'
    statusCode = 400
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values((err as any).errors).map((val: any) => val.message).join(', ')
    statusCode = 400
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token'
    statusCode = 401
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token expired'
    statusCode = 401
  }

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next)
