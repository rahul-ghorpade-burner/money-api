import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware } from './authMiddleware.js';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';

vi.mock('jsonwebtoken');
vi.mock('../lib/env.js', () => ({
  env: {
    SUPABASE_JWT_SECRET: 'test-secret',
    ALLOWED_ORIGIN: 'http://localhost:3000'
  }
}));

describe('authMiddleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should return 401 if authorization header is missing', () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'UNAUTHORIZED'
      })
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    req.headers.authorization = 'Bearer invalid-token';
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid token');
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is valid but missing sub claim', () => {
    req.headers.authorization = 'Bearer no-sub-token';
    vi.mocked(jwt.verify).mockReturnValue({} as any);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'UNAUTHORIZED'
      })
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set userId if token is valid', () => {
    req.headers.authorization = 'Bearer valid-token';
    vi.mocked(jwt.verify).mockReturnValue({ sub: 'user-123' } as any);

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', env.SUPABASE_JWT_SECRET);
    expect(req.userId).toBe('user-123');
    expect(next).toHaveBeenCalled();
  });
});
