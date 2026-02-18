import { Router, Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { configSchema } from '../lib/schemas.js'
import { logger } from '../lib/logger.js'

export const configRouter = Router()

// All routes require authentication
configRouter.use(authMiddleware)

// GET /api/config
export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_config')
      .select('monthly_income, savings_percentage')
      .eq('user_id', req.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Config not found' },
        })
      }
      return next(error)
    }

    return res.json({
      monthly_income: parseFloat(data.monthly_income).toFixed(2),
      savings_percentage: parseFloat(data.savings_percentage).toFixed(2),
    })
  } catch (err) {
    next(err)
  }
}

// PUT /api/config
export const updateConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = configSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.issues[0]?.message ?? 'Validation failed',
        },
      })
    }

    const { monthly_income, savings_percentage } = result.data

    const { data, error } = await supabaseAdmin
      .from('user_config')
      .upsert(
        {
          user_id: req.userId,
          monthly_income,
          savings_percentage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('monthly_income, savings_percentage')
      .single()

    if (error || !data) {
      logger.error({ requestId: req.requestId, err: error }, 'Failed to upsert config')
      return next(new Error('Failed to save config'))
    }

    return res.json({
      monthly_income: parseFloat(data.monthly_income).toFixed(2),
      savings_percentage: parseFloat(data.savings_percentage).toFixed(2),
    })
  } catch (err) {
    next(err)
  }
}

configRouter.get('/', getConfig)
configRouter.put('/', updateConfig)
