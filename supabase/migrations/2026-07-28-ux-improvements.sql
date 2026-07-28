-- Kör i Supabase SQL Editor för befintliga projekt
-- Lägger till namn på historikposter och stöd för ångra (reverse)

alter table bucket_transactions
  add column if not exists actor_name text;

alter table bucket_transactions
  add column if not exists reverses_id uuid references bucket_transactions(id);
