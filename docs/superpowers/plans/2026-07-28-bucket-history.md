# Bucket History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log each bucket adjust as an append-only history entry (amount, add/remove, optional description) shown in the existing adjust sheet, while keeping `buckets.balance` as the source of truth.

**Architecture:** New `bucket_transactions` table; adjust updates balance then inserts a transaction; AdjustModal loads/shows history with optional description field.

**Tech Stack:** React, Supabase, TypeScript, CSS modules

## Global Constraints

- `buckets.balance` remains authoritative — never recompute from history
- History is append-only (no edit/delete of transactions)
- Description is optional; empty string → null
- Swedish UI copy
- Existing balances unchanged by migration

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/schema.sql` | Full schema including `bucket_transactions` |
| `supabase/migrations/2026-07-28-bucket-transactions.sql` | Migration for existing projects |
| `src/lib/types.ts` | `BucketTransaction` type |
| `src/lib/format.ts` | Date formatting helper |
| `src/lib/buckets.ts` | Extend `adjustBucketBalance` to accept description + insert transaction |
| `src/lib/transactions.ts` | Fetch + subscribe to bucket transactions |
| `src/components/AdjustModal.tsx` | Description field + history list |
| `src/components/Modal.module.css` | History list styles |
| `src/pages/Home.tsx` | Pass description; keep sheet open on adjust |

---

### Task 1: Database schema

- [ ] Add `bucket_transactions` to `supabase/schema.sql`
- [ ] Create `supabase/migrations/2026-07-28-bucket-transactions.sql` with same DDL for existing DBs
- [ ] Commit

### Task 2: Types and data layer

- [ ] Add `TransactionDirection` and `BucketTransaction` to `types.ts`
- [ ] Add `formatTransactionDate` to `format.ts`
- [ ] Create `transactions.ts` with `fetchBucketTransactions` and `subscribeToBucketTransactions`
- [ ] Update `adjustBucketBalance(bucket, delta, description?)` to insert transaction after balance update
- [ ] Commit

### Task 3: AdjustModal UI

- [ ] Add optional description input
- [ ] Load history when sheet opens; subscribe for realtime
- [ ] Render history list (signed amounts, description, date)
- [ ] On success: clear form, refresh history, keep sheet open; call `onAdjust` with description
- [ ] Update `Home.handleAdjust` signature accordingly
- [ ] Commit

### Task 4: Verify

- [ ] `npm run build` passes
- [ ] Manual checklist from spec (after user runs migration in Supabase)
