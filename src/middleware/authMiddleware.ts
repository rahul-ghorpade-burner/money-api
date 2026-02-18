import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSupabasePublicKey } from '../lib/jwks.js';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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
    const publicKey = await getSupabasePublicKey();
    const payload = jwt.verify(token, publicKey, { algorithms: ['ES256'] }) as { sub?: string };
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
