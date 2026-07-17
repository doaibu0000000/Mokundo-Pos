-- supabase/migrations/004_simplify_schema.sql
-- COMPLETE FIX: Remove auth.uid() dependency and make store_id nullable
-- This makes the app work without Supabase Auth login

-- Step 1: Drop all old RLS policies first
DROP POLICY IF EXISTS "Stores owner full access" ON public.stores;
DROP POLICY IF EXISTS "Categories store owner full access" ON public.categories;
DROP POLICY IF EXISTS "Products store owner full access" ON public.products;
DROP POLICY IF EXISTS "Shifts store owner full access" ON public.shifts;
DROP POLICY IF EXISTS "Transactions store owner full access" ON public.transactions;
DROP POLICY IF EXISTS "Items owner access check transactions owner" ON public.transaction_items;
DROP POLICY IF EXISTS "Stock logs store owner full access" ON public.stock_logs;
DROP POLICY IF EXISTS "Allow all on stores" ON public.stores;
DROP POLICY IF EXISTS "Allow all on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all on products" ON public.products;
DROP POLICY IF EXISTS "Allow all on shifts" ON public.shifts;
DROP POLICY IF EXISTS "Allow all on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow all on transaction_items" ON public.transaction_items;
DROP POLICY IF EXISTS "Allow all on stock_logs" ON public.stock_logs;

-- Step 2: Disable RLS entirely (simplest approach for a POS app)
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_logs DISABLE ROW LEVEL SECURITY;

-- Step 3: Make store_id nullable so inserts work without UUID
ALTER TABLE public.categories ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE public.shifts ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE public.stock_logs ALTER COLUMN store_id DROP NOT NULL;

-- Step 4: Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
