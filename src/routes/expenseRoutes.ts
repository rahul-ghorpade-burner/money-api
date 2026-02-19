import { Router, Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { expenseCreateSchema, monthQuerySchema } from '../lib/schemas.js'
import { logger } from '../lib/logger.js'

export const expenseRouter = Router()

// All routes require authentication
expenseRouter.use(authMiddleware)

// GET /api/expenses?month=YYYY-MM
expenseRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = monthQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: queryResult.error.issues[0]?.message ?? 'month parameter required',
        },
      })
    }

    const { month } = queryResult.data
    // Build date range for the given YYYY-MM month
    const startDate = `${month}-01`
    const [year, mon] = month.split('-').map(Number)
    const nextMonthYear = mon === 12 ? year + 1 : year
    const nextMonthNum = mon === 12 ? 1 : mon + 1
    const endDate = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('id, amount, label, expense_date, created_at')
      .eq('user_id', req.userId)
      .gte('expense_date', startDate)
      .lt('expense_date', endDate)
      .order('expense_date', { ascending: false })

    if (error) {
      logger.error({ requestId: req.requestId, err: error }, 'Failed to fetch expenses')
      return next(new Error('Failed to fetch expenses'))
    }

    const formatted = (data ?? []).map((e) => ({
      id: e.id,
      amount: parseFloat(e.amount).toFixed(2),
      label: e.label ?? null,
      expense_date: e.expense_date,
      created_at: e.created_at,
    }))

    return res.json(formatted)
  } catch (err) {
    next(err)
  }
})

// POST /api/expenses
expenseRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodyResult = expenseCreateSchema.safeParse(req.body)
    if (!bodyResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: bodyResult.error.issues[0]?.message ?? 'Validation failed',
        },
      })
    }

    const { amount, label, expense_date } = bodyResult.data

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        user_id: req.userId,
        amount,
        label: label ?? null,
        expense_date,
      })
      .select('id, amount, label, expense_date, created_at')
      .single()

    if (error || !data) {
      logger.error({ requestId: req.requestId, err: error }, 'Failed to insert expense')
      return next(new Error('Failed to create expense'))
    }

    return res.status(201).json({
      id: data.id,
      amount: parseFloat(data.amount).toFixed(2),
      label: data.label ?? null,
      expense_date: data.expense_date,
      created_at: data.created_at,
    })
  } catch (err) {
    next(err)
  }
})
