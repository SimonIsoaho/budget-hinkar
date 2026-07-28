# UX Improvements Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Nicknames, undo via reverse tx, history retry, offline banner, install prompt.

**Architecture:** Extend `bucket_transactions` with `actor_name` and `reverses_id`; localStorage for display name and install dismiss; app-shell banners.

**Tech Stack:** React, Supabase, TypeScript, CSS modules

---

### Task 1: Schema + types + storage
### Task 2: buckets/transactions API (adjust with retry payload, undo)
### Task 3: AdjustModal (name prompt, undo, retry, offline disable)
### Task 4: OfflineBanner + InstallPrompt + Home name edit
### Task 5: Build verify + commit
