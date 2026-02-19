import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import jwt from 'jsonwebtoken'

vi.mock('../lib/env.js', () => ({
  env: {
    SUPABASE_JWT_SECRET: 'test-secret',
    ALLOWED_ORIGIN: 'http://localhost:3000',
  },
}))

vi.mock('../lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
}))

vi.mock('../lib/jwks.js', () => ({
  getSupabasePublicKey: vi.fn().mockResolvedValue('mock-public-key'),
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
    decode: vi.fn(),
  },
}))

describe('expenseRoutes Integration', () => {
  const validToken = 'valid-token'
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(jwt.verify).mockReturnValue({ sub: userId } as any)
  })

  describe('GET /api/expenses', () => {
    it('returns 401 when no Authorization header', async () => {
      const response = await request(app).get('/api/expenses')
      expect(response.status).toBe(401)
    })

    it('returns 400 when month param is missing', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
      })
    })

    it('returns 400 when month param is invalid format "2026-2"', async () => {
      const response = await request(app)
        .get('/api/expenses?month=2026-2')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when month param is invalid format "2026-02-17"', async () => {
      const response = await request(app)
        .get('/api/expenses?month=2026-02-17')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 200 with empty array when no expenses for month', async () => {
      vi.mocked(supabaseAdmin.order).mockResolvedValue({ data: [], error: null } as any)

      const response = await request(app)
        .get('/api/expenses?month=2026-02')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('returns 200 with correctly shaped array', async () => {
      vi.mocked(supabaseAdmin.order).mockResolvedValue({
        data: [
          {
            id: 'expense-uuid-1',
            amount: '640',
            label: 'lunch',
            expense_date: '2026-02-17',
            created_at: '2026-02-17T12:00:00Z',
          },
        ],
        error: null,
      } as any)

      const response = await request(app)
        .get('/api/expenses?month=2026-02')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual([
        {
          id: 'expense-uuid-1',
          amount: '640.00',
          label: 'lunch',
          expense_date: '2026-02-17',
          created_at: '2026-02-17T12:00:00Z',
        },
      ])
    })

    it('returns 200 with results sorted by expense_date descending (DB handles order)', async () => {
      vi.mocked(supabaseAdmin.order).mockResolvedValue({
        data: [
          {
            id: 'expense-uuid-2',
            amount: '200',
            label: 'dinner',
            expense_date: '2026-02-18',
            created_at: '2026-02-18T18:00:00Z',
          },
          {
            id: 'expense-uuid-1',
            amount: '640',
            label: 'lunch',
            expense_date: '2026-02-17',
            created_at: '2026-02-17T12:00:00Z',
          },
        ],
        error: null,
      } as any)

      const response = await request(app)
        .get('/api/expenses?month=2026-02')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(200)
      expect(response.body[0].expense_date).toBe('2026-02-18')
      expect(response.body[1].expense_date).toBe('2026-02-17')
      expect(supabaseAdmin.order).toHaveBeenCalledWith('expense_date', { ascending: false })
    })
  })

  describe('POST /api/expenses', () => {
    it('returns 401 when no Authorization header', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ amount: '640.00', label: 'lunch', expense_date: '2026-02-17' })

      expect(response.status).toBe(401)
    })

    it('returns 201 with correct shape when amount + label + expense_date provided', async () => {
      vi.mocked(supabaseAdmin.single).mockResolvedValue({
        data: {
          id: 'expense-uuid-1',
          amount: '640',
          label: 'lunch',
          expense_date: '2026-02-17',
          created_at: '2026-02-17T12:00:00Z',
        },
        error: null,
      } as any)

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: '640.00', label: 'lunch', expense_date: '2026-02-17' })

      expect(response.status).toBe(201)
      expect(response.body).toEqual({
        id: 'expense-uuid-1',
        amount: '640.00',
        label: 'lunch',
        expense_date: '2026-02-17',
        created_at: '2026-02-17T12:00:00Z',
      })
    })

    it('returns 201 when label is omitted (optional)', async () => {
      vi.mocked(supabaseAdmin.single).mockResolvedValue({
        data: {
          id: 'expense-uuid-2',
          amount: '100',
          label: null,
          expense_date: '2026-02-17',
          created_at: '2026-02-17T12:00:00Z',
        },
        error: null,
      } as any)

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: '100.00', expense_date: '2026-02-17' })

      expect(response.status).toBe(201)
      expect(response.body.label).toBeNull()
    })

    it('returns 400 when amount is missing', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ label: 'lunch', expense_date: '2026-02-17' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when amount is "0"', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: '0', label: 'lunch', expense_date: '2026-02-17' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when amount is "-5.00"', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: '-5.00', label: 'lunch', expense_date: '2026-02-17' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when amount is non-numeric "abc"', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: 'abc', label: 'lunch', expense_date: '2026-02-17' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when label exceeds 200 characters', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: '100.00', label: 'a'.repeat(201), expense_date: '2026-02-17' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
