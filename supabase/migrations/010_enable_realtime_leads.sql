-- Enable Supabase Realtime for the leads table
-- This allows the dashboard to receive instant push notifications
-- when a new lead/quote submission is inserted.

alter publication supabase_realtime add table public.leads;
