-- supabase/migrations/002_rls_policies.sql
-- Configure Row Level Security (RLS) rules for Mokundo POS multi-tenant database structure

-- ====================================================================
-- 1. STORES table policies
-- ====================================================================
CREATE POLICY "Stores owner full access" ON public.stores
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ====================================================================
-- 2. CATEGORIES table policies
-- ====================================================================
CREATE POLICY "Categories store owner full access" ON public.categories
    FOR ALL
    USING (auth.uid() = store_id)
    WITH CHECK (auth.uid() = store_id);

-- ====================================================================
-- 3. PRODUCTS table policies
-- ====================================================================
CREATE POLICY "Products store owner full access" ON public.products
    FOR ALL
    USING (auth.uid() = store_id)
    WITH CHECK (auth.uid() = store_id);

-- ====================================================================
-- 4. SHIFTS table policies
-- ====================================================================
CREATE POLICY "Shifts store owner full access" ON public.shifts
    FOR ALL
    USING (auth.uid() = store_id)
    WITH CHECK (auth.uid() = store_id);

-- ====================================================================
-- 5. TRANSACTIONS table policies
-- ====================================================================
CREATE POLICY "Transactions store owner full access" ON public.transactions
    FOR ALL
    USING (auth.uid() = store_id)
    WITH CHECK (auth.uid() = store_id);

-- ====================================================================
-- 6. TRANSACTION ITEMS table policies (dependent subquery RLS)
-- ====================================================================
CREATE POLICY "Items owner access check transactions owner" ON public.transaction_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_items.transaksi_id
            AND t.store_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_items.transaksi_id
            AND t.store_id = auth.uid()
        )
    );

-- ====================================================================
-- 7. STOCK LOGS table policies
-- ====================================================================
CREATE POLICY "Stock logs store owner full access" ON public.stock_logs
    FOR ALL
    USING (auth.uid() = store_id)
    WITH CHECK (auth.uid() = store_id);
