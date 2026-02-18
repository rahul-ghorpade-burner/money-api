import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware } from './authMiddleware.js';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');
vi.mock('../lib/jwks.js', () => ({
  getSupabasePublicKey: vi.fn().mockResolvedValue('mock-public-key'),
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

  it('should return 401 if authorization header is missing', async () => {
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'UNAUTHORIZED'
      })
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid token');
    });

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is valid but missing sub claim', async () => {
    req.headers.authorization = 'Bearer no-sub-token';
    vi.mocked(jwt.verify).mockReturnValue({} as any);

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'UNAUTHORIZED'
      })
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set userId if token is valid', async () => {
    req.headers.authorization = 'Bearer valid-token';
    vi.mocked(jwt.verify).mockReturnValue({ sub: 'user-123' } as any);

    await authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'mock-public-key', { algorithms: ['ES256'] });
    expect(req.userId).toBe('user-123');
    expect(next).toHaveBeenCalled();
  });
});
