# Period Summary, Transfers & Activity Feed Design

**Date:** 2026-07-28  
**Status:** Approved  
**Scope:** Home period summary (25→24), transfer between buckets, recent activity feed.

## Summary

Add three home-screen features: a period cashflow card (25th–24th window, excluding transfers), a “Flytta mellan hinkar” flow that moves money with two linked history rows, and a “Senaste” feed of the last five household transactions.

## Decisions

| Item | Choice |
|------|--------|
| Period summary location | Home only |
| Period definition | 25th inclusive → 24th inclusive next cycle |
| Period in/out | Exclude transactions with `transfer_id` |
| Transfer entry | Home button only |
| Transfer storage | Two rows + shared `transfer_id` |
| Activity feed | Last 5 household transactions on home; tap opens bucket |

## Period window (25 → 24)

Client helper `getCurrentPeriod(now = new Date())`:

- If `day >= 25`: start = 25th of this month 00:00, end = 24th of next month 23:59:59.999
- Else: start = 25th of previous month 00:00, end = 24th of this month 23:59:59.999

Display label in Swedish, e.g. `25 jul – 24 aug`.

## Data model

```sql
alter table bucket_transactions
  add column if not exists transfer_id uuid;

create index if not exists bucket_transactions_transfer_id_idx
  on bucket_transactions (transfer_id)
  where transfer_id is not null;
```

Also update `supabase/schema.sql`. No change to `buckets.balance` semantics.

`BucketTransaction` gains `transfer_id: string | null`.

## 3. Period summary (home)

Card under total balance:

- Title: **Denna period**
- Subtitle: date range
- Two figures: **In** (sum of `add` where `transfer_id is null` and `created_at` in window) and **Ut** (sum of `remove`, same filters)
- Data: fetch household transactions for the period (or all recent and filter client-side if volume is small). Prefer query filtered by date + household via buckets join.

## 4. Transfer

UI sheet from home **Flytta mellan hinkar**:

- From bucket (select)
- To bucket (select, ≠ from)
- Amount (required)
- Description (optional)
- Requires display name (same gate as adjust)

On confirm:

1. Validate amount, from ≠ to, ≥ 2 buckets, online
2. Generate `transfer_id = crypto.randomUUID()`
3. Update from balance (−amount), to balance (+amount)
4. Insert remove on from: `direction=remove`, description default `Flytt till {to.name}` or user text, `transfer_id`, `actor_name`
5. Insert add on to: `direction=add`, description default `Flytt från {from.name}` or user text, same `transfer_id`, `actor_name`

If balances succeed but history fails: show Swedish error + retry for pending history payloads (extend existing retry pattern). Prefer sequential updates; on failure after first balance change, attempt to surface inconsistent state clearly (refetch both buckets).

## 6. Activity feed

Home section **Senaste**:

- Last 5 transactions for household (join `buckets` for name), newest first
- Row: `{actor} · {±amount} · {bucketName}` + short time
- Transfers appear as two rows (or show once with “flytt” — **show both rows** for honesty)
- Tap row → open that bucket’s AdjustModal
- Refresh on load + realtime subscription on `bucket_transactions` for household buckets (or refetch when buckets realtime fires)

## Home layout (top → bottom)

1. Household name, code, display name  
2. Totalt  
3. Period card (in/out)  
4. Senaste (5)  
5. Bucket list  
6. Lägg till hink / Flytta mellan hinkar / Lämna hushåll  

## Out of scope

- Calendar-month toggle  
- Transfer from bucket sheet  
- Editing/cancelling transfers as a pair undo (undo still works per-row)  
- Pagination beyond 5 activity items  

## Test plan

1. On the 28th, period label spans 25 this month – 24 next; on the 20th, 25 previous – 24 this  
2. Add/remove count toward In/Ut; transfer does not  
3. Transfer 100 Mat → Semester: balances move; two history rows share `transfer_id`  
4. Senaste shows new rows for both partners (realtime)  
5. Tap activity row opens correct bucket  
6. Transfer blocked offline / with &lt; 2 buckets / same from-to  
