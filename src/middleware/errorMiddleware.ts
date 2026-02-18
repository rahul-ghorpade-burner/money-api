import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    err,
    method: req.method,
    url: req.url,
    requestId: req.requestId,
  }, 'Unhandled exception');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};
