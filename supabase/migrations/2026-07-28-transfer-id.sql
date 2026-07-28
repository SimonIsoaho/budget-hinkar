-- Kör i Supabase SQL Editor för befintliga projekt
-- Länkar flyttar mellan hinkar (räknas inte in i period in/ut)

alter table bucket_transactions
  add column if not exists transfer_id uuid;

create index if not exists bucket_transactions_transfer_id_idx
  on bucket_transactions (transfer_id)
  where transfer_id is not null;
