-- supabase/migrations/003_enable_realtime.sql
-- Enable Supabase Realtime for all tables so postgres_changes events are broadcast

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
