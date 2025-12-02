-- Create table for recurring monthly clients
create table if not exists public.recurring_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  amount numeric(12,2) not null default 0,
  due_date date not null,
  notes text,
  created_at timestamp with time zone default now()
);

alter table public.recurring_clients enable row level security;

create index if not exists recurring_clients_user_idx on public.recurring_clients(user_id);
create index if not exists recurring_clients_due_date_idx on public.recurring_clients(due_date);

create policy "Users can view their recurring clients"
  on public.recurring_clients for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can add their recurring clients"
  on public.recurring_clients for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their recurring clients"
  on public.recurring_clients for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their recurring clients"
  on public.recurring_clients for delete
  to authenticated
  using (auth.uid() = user_id);
