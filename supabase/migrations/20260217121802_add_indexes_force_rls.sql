-- Add indexes for primary query patterns
-- expenses is queried by user_id on every request and by expense_date for month scoping
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);

-- Force RLS so PostgreSQL superuser/table owner cannot bypass policies
ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_config FORCE ROW LEVEL SECURITY;

-- Remove DELETE policy from user_config
-- Deleting the config row breaks the app; the single user can only update their budget settings
DROP POLICY "Users can delete their own config" ON public.user_config;
