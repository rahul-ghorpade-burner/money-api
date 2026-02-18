import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header'
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.SUPABASE_JWT_SECRET) as { sub?: string };
    if (!payload.sub) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token: missing user identity'
        }
      });
    }
    req.userId = payload.sub;
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }
};
