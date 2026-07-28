-- Kör i Supabase SQL Editor för befintliga projekt
-- Uppdaterar inte buckets.balance — lägger bara till historiktabell

create table if not exists bucket_transactions (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references buckets(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  direction text not null check (direction in ('add', 'remove')),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists bucket_transactions_bucket_id_created_at_idx
  on bucket_transactions (bucket_id, created_at desc);

alter table bucket_transactions enable row level security;

create policy "bucket_transactions_select" on bucket_transactions for select using (true);
create policy "bucket_transactions_insert" on bucket_transactions for insert with check (true);

alter publication supabase_realtime add table bucket_transactions;
