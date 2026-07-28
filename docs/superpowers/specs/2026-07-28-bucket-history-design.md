# Bucket History Design

**Date:** 2026-07-28  
**Status:** Approved  
**Scope:** Append-only transaction history per bucket, with optional description, shown in the existing adjust sheet.

## Summary

When adjusting a bucket balance, log each change as a history entry (amount, add/remove, optional description). History is shown in the same bottom sheet as the adjust form. `buckets.balance` remains the authoritative current amount and is updated exactly as today — history is an audit log, not a recalculation source.

## Decisions

| Decision | Choice |
|----------|--------|
| Where history is shown | Same sheet as adjust (tap bucket → form + history) |
| Mutability | Append-only (no edit/delete of history rows) |
| Balance source of truth | Existing `buckets.balance` column (unchanged) |
| Description | Optional free text |
| Backfill | None — history starts when the feature ships |
| Storage | New `bucket_transactions` table |

## Data model

```sql
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
```

### Field rules

- `amount` is always stored as a positive number
- `direction` is `'add'` or `'remove'` (maps to UI “Lägg till” / “Ta bort”)
- `description` is nullable; empty/whitespace trimmed to `null`
- Deleting a bucket cascades and removes its history

### Migration note

Add migration SQL to `supabase/schema.sql` (full schema for new projects) and a short `supabase/migrations/2026-07-28-bucket-transactions.sql` for existing projects to run in the Supabase SQL editor.

## Adjust flow

1. User opens bucket sheet (existing tap on card)
2. Enters amount (required) and description (optional)
3. Taps **Lägg till** or **Ta bort**
4. App:
   - Updates `buckets.balance` with the same formula as today
   - Inserts a `bucket_transactions` row
5. On success: clear form fields, refresh history list, keep sheet open (so user can see the new entry)
6. On failure: show Swedish error message; refetch balance so UI stays consistent

Existing balances and buckets are not modified by the migration — only new adjusts create history.

## UI

### Adjust sheet layout (top → bottom)

1. **Header** — bucket name + current balance
2. **Form** — amount input, optional description input, Lägg till / Ta bort buttons
3. **History section** — heading “Historik”, list newest first
4. **Delete bucket** — existing “Radera hinken” link at the bottom

### History row

Each row shows:

- Signed amount: `+500 kr` (green) or `−200 kr` (red)
- Description under the amount when present (secondary text)
- Timestamp: short Swedish format, e.g. `28 jun 14:32`

Empty state: “Inga ändringar ännu”

### Form behavior

- Description placeholder: e.g. `Beskrivning (valfritt)`
- After a successful adjust, keep the sheet open and prepend the new entry to the list
- Loading state disables both action buttons while saving

## App layer

### Types

```ts
type TransactionDirection = 'add' | 'remove';

type BucketTransaction = {
  id: string;
  bucket_id: string;
  amount: number;
  direction: TransactionDirection;
  description: string | null;
  created_at: string;
};
```

### API (`src/lib/transactions.ts` or extend `buckets.ts`)

- `fetchBucketTransactions(bucketId)` — ordered by `created_at` desc
- `adjustBucketBalance(bucket, delta, description?)` — update balance + insert transaction
- `subscribeToBucketTransactions(bucketId, onChange)` — realtime refresh of history when partner adjusts

### Component changes

- `AdjustModal` — add description field + history list; extend `onAdjust` to accept optional description
- `Home` — pass description through; no home-list changes beyond existing balance updates

## Out of scope

- Editing or deleting history entries
- Reversing balance when deleting history
- Computing balance from history
- Backfilling past adjusts
- Who made the change (no user accounts)
- Filtering / search / export

## Test plan

1. Open existing bucket with current balance — balance unchanged after deploying schema
2. Add 100 kr with description “ICA” → balance +100, history shows `+100 kr` / ICA
3. Remove 40 kr without description → balance −40, history shows `−40 kr` with no description line
4. Partner device sees updated balance and new history line (realtime)
5. Delete bucket → transactions gone (cascade)
6. Invalid amount still blocked; empty description allowed
