import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import jwt from 'jsonwebtoken'

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

vi.mock('../lib/jwks.js', () => ({
  getSupabasePublicKey: vi.fn().mockResolvedValue('mock-public-key'),
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
    decode: vi.fn()
  }
}))

describe('configRoutes Integration', () => {
  const validToken = 'valid-token'
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(jwt.verify).mockReturnValue({ sub: userId } as any)
  })

  describe('GET /api/config', () => {
    it('returns 401 when no token is provided', async () => {
      const response = await request(app).get('/api/config')
      expect(response.status).toBe(401)
    })

    it('returns 200 when authenticated', async () => {
      vi.mocked(supabaseAdmin.single).mockResolvedValue({
        data: { monthly_income: '5000', savings_percentage: '10' },
        error: null
      } as any)

      const response = await request(app)
        .get('/api/config')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        monthly_income: '5000.00',
        savings_percentage: '10.00'
      })
    })
  })

  describe('PUT /api/config', () => {
    it('returns 401 when no token is provided', async () => {
      const response = await request(app).put('/api/config').send({
        monthly_income: '6000',
        savings_percentage: '15'
      })
      expect(response.status).toBe(401)
    })

    it('returns 200 and upserts when authenticated and valid data', async () => {
      vi.mocked(supabaseAdmin.single).mockResolvedValue({
        data: { monthly_income: '6000', savings_percentage: '15' },
        error: null
      } as any)

      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          monthly_income: '6000.00',
          savings_percentage: '15.00'
        })

      expect(response.status).toBe(200)
      expect(supabaseAdmin.upsert).toHaveBeenCalled()
    })

    it('returns 400 for invalid data even if authenticated', async () => {
      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          monthly_income: '-100',
          savings_percentage: '15'
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
