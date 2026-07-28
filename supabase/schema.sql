-- Kör detta i Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null default 'Vårt hushåll',
  created_at timestamptz not null default now()
);

create table if not exists buckets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buckets_household_id_idx on buckets (household_id);

alter table households enable row level security;
alter table buckets enable row level security;

create policy "households_select" on households for select using (true);
create policy "households_insert" on households for insert with check (true);

create policy "buckets_select" on buckets for select using (true);
create policy "buckets_insert" on buckets for insert with check (true);
create policy "buckets_update" on buckets for update using (true);
create policy "buckets_delete" on buckets for delete using (true);

alter publication supabase_realtime add table buckets;

create table if not exists bucket_transactions (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references buckets(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  direction text not null check (direction in ('add', 'remove')),
  description text,
  actor_name text,
  reverses_id uuid references bucket_transactions(id),
  created_at timestamptz not null default now()
);

create index if not exists bucket_transactions_bucket_id_created_at_idx
  on bucket_transactions (bucket_id, created_at desc);

alter table bucket_transactions enable row level security;

create policy "bucket_transactions_select" on bucket_transactions for select using (true);
create policy "bucket_transactions_insert" on bucket_transactions for insert with check (true);

alter publication supabase_realtime add table bucket_transactions;
