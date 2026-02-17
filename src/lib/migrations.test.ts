import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, '../../supabase/migrations');

function loadAllMigrations(): string {
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // deterministic order by timestamp prefix
  return files.map(f => readFileSync(join(migrationsDir, f), 'utf8')).join('\n');
}

describe('Database Migrations', () => {
  let sql: string;

  beforeAll(() => {
    sql = loadAllMigrations();
  });

  it('has the initial_schema migration file', () => {
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    expect(files.some(f => f.includes('_initial_schema.sql'))).toBe(true);
  });

  describe('expenses table', () => {
    it('defines the table with correct column types', () => {
      expect(sql).toContain('CREATE TABLE public.expenses');
      expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql).toContain('user_id UUID NOT NULL REFERENCES auth.users(id)');
      expect(sql).toContain('amount NUMERIC(12, 2) NOT NULL');
      expect(sql).toContain('label TEXT');
      expect(sql).toContain('expense_date DATE NOT NULL');
      expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    });

    it('enables and forces RLS', () => {
      expect(sql).toContain('ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY');
    });

    it('defines RLS policies for all four operations using auth.uid()', () => {
      expect(sql).toContain('ON public.expenses');
      const policyMatches = sql.match(/ON public\.expenses\s+FOR (SELECT|INSERT|UPDATE|DELETE)/g);
      expect(policyMatches?.length).toBe(4);
      const uidMatches = sql.match(/auth\.uid\(\) = user_id/g);
      expect(uidMatches?.length).toBeGreaterThanOrEqual(4);
    });

    it('has a performance index on user_id', () => {
      expect(sql).toContain('idx_expenses_user_id');
    });

    it('has a performance index on expense_date for month-scoped queries', () => {
      expect(sql).toContain('idx_expenses_expense_date');
    });
  });

  describe('user_config table', () => {
    it('defines the table with correct column types', () => {
      expect(sql).toContain('CREATE TABLE public.user_config');
      expect(sql).toContain('user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id)');
      expect(sql).toContain('monthly_income NUMERIC(12, 2) NOT NULL');
      expect(sql).toContain('savings_percentage NUMERIC(5, 2) NOT NULL');
      expect(sql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    });

    it('enables and forces RLS', () => {
      expect(sql).toContain('ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('ALTER TABLE public.user_config FORCE ROW LEVEL SECURITY');
    });

    it('does not allow DELETE on user_config', () => {
      expect(sql).toContain('DROP POLICY "Users can delete their own config"');
    });
  });
});
