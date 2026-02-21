-- Appointments: for consultation booking via /book page
-- Run this in the Supabase SQL editor (gsxqrjywtugeuexrjcln)

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  service text,
  business text not null default 'ultratidy' check (business in ('ultratidy', 'dba', 'primefield')),
  appointment_date date not null,
  appointment_time text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_appointments_date on public.appointments(appointment_date);
create index if not exists idx_appointments_status on public.appointments(status);
create index if not exists idx_appointments_created_at on public.appointments(created_at desc);

-- RLS
alter table public.appointments enable row level security;

-- Public: anyone can book (insert). Uses service role in API so this is a safety net.
create policy "Anyone can book an appointment" on public.appointments
  for insert with check (true);

-- Admin: full access (read, update, delete)
create policy "Admin full access to appointments" on public.appointments
  for all using (is_admin());
