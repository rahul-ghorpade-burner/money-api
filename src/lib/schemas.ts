import { z } from 'zod'

// PUT /api/config request body
export const configSchema = z.object({
  monthly_income: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'monthly_income must be a positive numeric string')
    .refine((v) => parseFloat(v) > 0, 'monthly_income must be greater than 0'),
  savings_percentage: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'savings_percentage must be a numeric string')
    .refine(
      (v) => parseFloat(v) <= 100,
      'savings_percentage must be between 0 and 100'
    ),
})

export type ConfigBody = z.infer<typeof configSchema>

// POST /api/expenses request body
export const expenseCreateSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'amount must be a positive numeric string')
    .refine((v) => parseFloat(v) > 0, 'amount must be greater than 0'),
  label: z.string().max(200, 'label must be 200 characters or fewer').optional(),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expense_date must be a valid ISO date (YYYY-MM-DD)'),
})
export type ExpenseCreateBody = z.infer<typeof expenseCreateSchema>

// GET /api/expenses?month= query param
export const monthQuerySchema = z.object({
  month: z
    .string({ required_error: 'month parameter required' })
    .regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format'),
})
