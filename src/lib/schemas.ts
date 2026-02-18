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
