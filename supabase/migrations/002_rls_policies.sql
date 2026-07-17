-- supabase/migrations/002_rls_policies.sql
-- Configure Row Level Security (RLS) rules for Mokundo POS
-- This app uses anon key without Supabase Auth, so policies must allow anon access.

-- ====================================================================
-- 1. STORES table policies
-- ====================================================================
DROP POLICY IF EXISTS "Stores owner full access" ON public.stores;
CREATE POLICY "Allow all on stores" ON public.stores
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 2. CATEGORIES table policies
-- ====================================================================
DROP POLICY IF EXISTS "Categories store owner full access" ON public.categories;
CREATE POLICY "Allow all on categories" ON public.categories
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 3. PRODUCTS table policies
-- ====================================================================
DROP POLICY IF EXISTS "Products store owner full access" ON public.products;
CREATE POLICY "Allow all on products" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 4. SHIFTS table policies
-- ====================================================================
DROP POLICY IF EXISTS "Shifts store owner full access" ON public.shifts;
CREATE POLICY "Allow all on shifts" ON public.shifts
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 5. TRANSACTIONS table policies
-- ====================================================================
DROP POLICY IF EXISTS "Transactions store owner full access" ON public.transactions;
CREATE POLICY "Allow all on transactions" ON public.transactions
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 6. TRANSACTION ITEMS table policies
-- ====================================================================
DROP POLICY IF EXISTS "Items owner access check transactions owner" ON public.transaction_items;
CREATE POLICY "Allow all on transaction_items" ON public.transaction_items
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 7. STOCK LOGS table policies
-- ====================================================================
DROP POLICY IF EXISTS "Stock logs store owner full access" ON public.stock_logs;
CREATE POLICY "Allow all on stock_logs" ON public.stock_logs
  FOR ALL USING (true) WITH CHECK (true);
