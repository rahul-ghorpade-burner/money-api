import { describe, it, expect } from 'vitest'
import { configSchema } from './schemas.js'

describe('configSchema', () => {
  it('validates correct data', () => {
    const validData = {
      monthly_income: '5000.00',
      savings_percentage: '20.00'
    }
    const result = configSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('fails on negative monthly_income', () => {
    const invalidData = {
      monthly_income: '-1000.00',
      savings_percentage: '20.00'
    }
    const result = configSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('fails on zero monthly_income', () => {
    const invalidData = {
      monthly_income: '0.00',
      savings_percentage: '20.00'
    }
    const result = configSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('fails on savings_percentage > 100', () => {
    const invalidData = {
      monthly_income: '5000.00',
      savings_percentage: '101.00'
    }
    const result = configSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('fails on negative savings_percentage', () => {
    const invalidData = {
      monthly_income: '5000.00',
      savings_percentage: '-1.00'
    }
    const result = configSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})
