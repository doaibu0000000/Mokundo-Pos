-- supabase/migrations/005_drop_foreign_keys.sql
-- In an offline-first app, sync can happen out of order (e.g. transactions sync before shifts, or items sync before transactions).
-- This causes foreign key violations. We drop the strict foreign keys to allow data to eventually become consistent.

-- Drop foreign key for store_id in all tables
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_store_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_store_id_fkey;
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_store_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_store_id_fkey;
ALTER TABLE public.stock_logs DROP CONSTRAINT IF EXISTS stock_logs_store_id_fkey;

-- Drop foreign key for shift_id in transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_shift_id_fkey;

-- Drop foreign key for transaksi_id in transaction_items
ALTER TABLE public.transaction_items DROP CONSTRAINT IF EXISTS transaction_items_transaksi_id_fkey;

-- Drop foreign key for produk_id in stock_logs (just in case)
ALTER TABLE public.stock_logs DROP CONSTRAINT IF EXISTS stock_logs_produk_id_fkey;

-- We leave the columns intact, they just don't strictly enforce references anymore.
