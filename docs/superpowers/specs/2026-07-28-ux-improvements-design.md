# UX Improvements Design (Nicknames, Undo, History Retry, Offline, Install)

**Date:** 2026-07-28  
**Status:** Approved  
**Scope:** Device nicknames on history, undo latest change, retry failed history inserts, offline banner, PWA install prompt.

## Summary

Five quality-of-life improvements for the shared-bucket PWA. `buckets.balance` remains the source of truth. History stays append-only; undo creates a reverse transaction rather than deleting rows.

## Decisions

| Item | Choice |
|------|--------|
| Nickname | Prompted on first adjust; editable later from home |
| Storage | `localStorage` display name + `actor_name` on each transaction |
| Undo | Reverse entry on latest eligible transaction only |
| Failed history | Balance may already be updated; show retry for history insert only |
| Offline | Top banner + disable adjust actions |
| Install | Soft banner (Android `beforeinstallprompt`, iOS tip); dismissible |

## 1. Nicknames

### Data
- `localStorage` key: `display_name`
- Column on `bucket_transactions`: `actor_name text` (nullable for legacy rows)

### UX
- First adjust with empty display name → inline prompt in AdjustModal: “Vad heter du?” + text field; required to proceed with that adjust
- Home: control “Ditt namn: …” (or “Ange ditt namn”) that opens a small edit flow (reuse TextModal or inline)
- History row shows actor name when present (e.g. secondary line: `Simon · 28 jul 14:32`)

### Writes
Every new transaction insert includes `actor_name` from current display name (trimmed; should always be set after first-adjust gate).

## 2. Undo

### Data
- Column: `reverses_id uuid null references bucket_transactions(id)`
- A transaction is “already reversed” if any other row has `reverses_id = that.id`
- Ångra only on the newest row that is not itself a reverse (`reverses_id is null`) and is not already reversed

### Behavior
1. User taps **Ångra** on that row (confirm: “Ångra denna ändring?”)
2. Update balance by opposite delta
3. Insert reverse transaction: opposite `direction`, same `amount`, `reverses_id` = original id, `description` = `Ångrade` or `Ångrade: {original description}`, `actor_name` = current display name
4. Refresh history

Same failed-history retry rules apply if the reverse insert fails after balance update.

## 3. Failed history write

### Adjust / undo flow
1. Update `buckets.balance`
2. Insert `bucket_transactions`
3. If (2) fails after (1) succeeded:
   - Keep updated balance in UI
   - Show error: “Saldo uppdaterades men historiken misslyckades”
   - Offer **Försök spara historik igen** which retries insert only (same payload: amount, direction, description, actor_name, reverses_id)
4. If (1) fails: show normal error; no history insert

Return type should expose enough state for the UI to retry (pending history payload).

## 7. Offline banner

- Global banner at top of app when `!navigator.onLine`
- Listen to `online` / `offline` events
- Copy: “Ingen anslutning — ändringar sparas inte förrän du är online”
- Disable Lägg till / Ta bort / Ångra while offline (show reason via disabled state or short hint)

No offline queue of writes.

## 8. Install prompt

- Component mounted in app shell
- **Chromium:** capture `beforeinstallprompt`, show banner “Installera Budgethinkar” with Install / Inte nu
- **iOS Safari (not standalone):** banner tip “På iPhone: Dela → Lägg till på hemskärmen” with Stäng
- Dismiss → `localStorage` key `install_prompt_dismissed=1` (don’t show again on that device)
- Hide when `display-mode: standalone` or related standalone checks

## Migration

`supabase/migrations/2026-07-28-ux-improvements.sql`:

```sql
alter table bucket_transactions
  add column if not exists actor_name text,
  add column if not exists reverses_id uuid references bucket_transactions(id);

-- Also update supabase/schema.sql for new projects
```

Does not change existing balances or rows beyond new nullable columns.

## Files (expected)

| Area | Files |
|------|--------|
| Schema | `supabase/schema.sql`, new migration |
| Types / API | `types.ts`, `buckets.ts`, `transactions.ts`, `storage.ts` (display name) |
| UI | `AdjustModal`, `Home`, new `OfflineBanner`, `InstallPrompt`, maybe `DisplayNameModal` |
| App shell | `App.tsx` or `Layout` for banners |

## Out of scope

- Full user accounts / auth
- Undo of arbitrary older rows
- Offline write queue
- Editing nicknames on past transactions
- Push notifications

## Test plan

1. Fresh device: adjust → prompted for name → history shows name
2. Change name from home → next adjust uses new name; old rows keep old names
3. Undo latest → reverse row appears, balance restored; cannot undo twice
4. Simulate history insert failure → retry succeeds without double balance change
5. Go offline → banner shows, adjust disabled; online → restored
6. Install banner appears on eligible browser; dismiss hides it; standalone has no banner
