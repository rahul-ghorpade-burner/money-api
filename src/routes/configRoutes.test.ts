import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getConfig, updateConfig } from './configRoutes'
import { supabaseAdmin } from '../lib/supabaseAdmin'

vi.mock('../lib/env.js', () => ({
  env: {
    SUPABASE_JWT_SECRET: 'test-secret',
    ALLOWED_ORIGIN: 'http://localhost:3000'
  }
}))

vi.mock('../lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    upsert: vi.fn().mockReturnThis(),
  }
}))

vi.mock('../middleware/authMiddleware.js', () => ({
  authMiddleware: vi.fn((req, res, next) => next())
}))

vi.mock('../lib/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  }
}))

describe('configRoutes', () => {
  let req: any
  let res: any
  let next: any

  beforeEach(() => {
    vi.clearAllMocks()
    req = {
      userId: 'user-123',
      body: {},
      headers: {},
      requestId: 'req-123'
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    next = vi.fn()
  })

  describe('GET /api/config', () => {
    it('returns 404 when no config exists', async () => {
      vi.mocked(supabaseAdmin.single).mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } } as any)

      await getConfig(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'NOT_FOUND', message: 'Config not found' }
      })
    })

    it('passes other DB errors to next()', async () => {
      const dbError = { code: 'OTHER_ERROR', message: 'DB Failure' }
      vi.mocked(supabaseAdmin.single).mockResolvedValue({ data: null, error: dbError } as any)

      await getConfig(req, res, next)

      expect(next).toHaveBeenCalledWith(dbError)
    })

    it('returns 200 with formatted data when config exists', async () => {
      vi.mocked(supabaseAdmin.single).mockResolvedValue({
        data: { monthly_income: '80000', savings_percentage: '20' },
        error: null
      } as any)

      await getConfig(req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        monthly_income: '80000.00',
        savings_percentage: '20.00'
      })
    })
  })

  describe('PUT /api/config', () => {
    it('returns 200 and upserts config (insert case)', async () => {
      req.body = { monthly_income: '90000.00', savings_percentage: '25.00' }
      vi.mocked(supabaseAdmin.single).mockResolvedValue({
        data: { monthly_income: '90000', savings_percentage: '25' },
        error: null
      } as any)

      await updateConfig(req, res, next)

      expect(supabaseAdmin.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          monthly_income: '90000.00',
          savings_percentage: '25.00'
        }),
        { onConflict: 'user_id' }
      )
      expect(res.json).toHaveBeenCalledWith({
        monthly_income: '90000.00',
        savings_percentage: '25.00'
      })
    })

    it('returns 200 and updates existing config (update case)', async () => {
      req.body = { monthly_income: '100000.00', savings_percentage: '30.00' }
      vi.mocked(supabaseAdmin.single).mockResolvedValue({
        data: { monthly_income: '100000', savings_percentage: '30' },
        error: null
      } as any)

      await updateConfig(req, res, next)

      expect(supabaseAdmin.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          monthly_income: '100000.00',
          savings_percentage: '30.00'
        }),
        { onConflict: 'user_id' }
      )
      expect(res.json).toHaveBeenCalledWith({
        monthly_income: '100000.00',
        savings_percentage: '30.00'
      })
    })

    it('returns 400 when monthly_income is negative', async () => {
      req.body = { monthly_income: '-1000.00', savings_percentage: '20.00' }

      await updateConfig(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
      }))
    })

    it('returns 400 when savings_percentage > 100', async () => {
      req.body = { monthly_income: '5000.00', savings_percentage: '101.00' }

      await updateConfig(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
      }))
    })
  })
})
