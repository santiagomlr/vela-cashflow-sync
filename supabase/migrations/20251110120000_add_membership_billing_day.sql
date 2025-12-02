-- Add billing day to recurring clients to track monthly charge day
alter table public.recurring_clients
  add column if not exists billing_day integer not null default 1;

-- Backfill existing records using their current due dates
update public.recurring_clients
set billing_day = extract(day from due_date)
where billing_day is null or billing_day = 1;

-- Link transactions to recurring clients for membership payments
alter table public.transactions
  add column if not exists recurring_client_id uuid references public.recurring_clients(id);

create index if not exists transactions_recurring_client_idx
  on public.transactions(recurring_client_id);
