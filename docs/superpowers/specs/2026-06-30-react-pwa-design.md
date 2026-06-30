# Budgethinkar — React Web PWA Design

**Date:** 2026-06-30  
**Status:** Approved  
**Scope:** Full replacement of Expo/React Native app with a Vite + React PWA deployed to Vercel.

## Summary

Rebuild Budgethinkar as a web-only Progressive Web App. The app lets couples create shared budget "buckets" (hinkar), sync balances in realtime via Supabase, and join households with an 8-character share code. The PWA is installable to the home screen but requires an internet connection — no offline data sync.

## Decisions

| Decision | Choice |
|----------|--------|
| Platform | Web-only PWA (replaces Expo/React Native entirely) |
| Offline | Installable shell only; no offline Supabase data |
| Hosting | Vercel (static SPA) |
| Framework | Vite + React + TypeScript |
| Routing | React Router v7 |
| PWA | `vite-plugin-pwa` (precache app shell, `registerType: 'autoUpdate'`) |
| Styling | CSS modules, mobile-first responsive |
| Backend | Existing Supabase schema unchanged |
| Language | Swedish UI copy (unchanged) |

## Architecture

```
/
├── index.html
├── vite.config.ts
├── vercel.json
├── public/
│   └── icons/              # 192×192, 512×512 PWA icons
├── src/
│   ├── main.tsx            # React root + RouterProvider
│   ├── App.tsx             # Route definitions
│   ├── index.css           # Global reset + CSS variables from theme
│   ├── pages/
│   │   ├── Index.tsx       # Loading → redirect /home or /setup
│   │   ├── Setup.tsx       # Create/join household
│   │   └── Home.tsx        # Bucket list + actions
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── BucketCard.tsx
│   │   ├── TextModal.tsx
│   │   ├── AdjustModal.tsx
│   │   └── Layout.tsx      # Page shell (replaces Screen)
│   ├── lib/
│   │   ├── buckets.ts      # Adapted from existing (no changes to logic)
│   │   ├── household.ts    # Adapted from existing
│   │   ├── format.ts       # Adapted from existing
│   │   ├── storage.ts      # localStorage instead of AsyncStorage
│   │   ├── supabase.ts     # VITE_ env vars, no AsyncStorage auth storage
│   │   └── types.ts        # Unchanged
│   └── constants/
│       └── theme.ts        # Unchanged token values
└── supabase/
    └── schema.sql          # Unchanged
```

### Removed

- `app/` (Expo Router screens)
- `app.json`, `app.config.js`, `eas.json`
- `scripts/dev-phone.sh`
- All React Native / Expo dependencies
- `AGENTS.md` Expo-specific note (update to reflect web stack)

## Routing

| Path | Component | Behavior |
|------|-----------|----------|
| `/` | `Index` | Check `localStorage` for household ID → redirect to `/home` or `/setup` |
| `/setup` | `Setup` | Three-step flow: choose → create or join |
| `/home` | `Home` | Bucket list, modals, share code, leave household |

SPA fallback via `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## UI Migration Map

| React Native | Web replacement |
|--------------|-----------------|
| `StyleSheet` | CSS modules (`.module.css`) |
| `View`, `Text` | `div`, `span`/`p`/`h1` |
| `Pressable` | `button` or clickable `div` with `role="button"` |
| `TextInput` | `<input>` |
| `FlatList` | `.map()` over bucket array |
| `Modal` | Bottom sheet overlay (`<dialog>` or fixed-position div) |
| `Alert.alert` | `window.confirm()` for destructive actions; inline error state for validation |
| `Share.share` | `navigator.share()` with clipboard fallback (`navigator.clipboard.writeText`) |
| `ActivityIndicator` | CSS spinner or simple SVG |
| `AsyncStorage` | `localStorage` |
| `KeyboardAvoidingView` | Not needed on web |
| `useNavigation().setOptions` | Header actions rendered inline in `Home` page layout |

### Visual design

Preserve the existing green theme from `constants/theme.ts`:

- Background: `#F4F7F5`
- Primary: `#1B6B4A`
- Mobile-first layout with max-width container (~480px) centered on desktop
- Bottom sheet modals on mobile; centered dialog on wider screens

## Data Layer

### Environment variables

Rename from Expo to Vite convention:

| Old | New |
|-----|-----|
| `EXPO_PUBLIC_SUPABASE_URL` | `VITE_SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` |

Update `.env.example` and README accordingly.

### Storage (`lib/storage.ts`)

```typescript
const HOUSEHOLD_KEY = 'household_id';

export function getStoredHouseholdId(): string | null {
  return localStorage.getItem(HOUSEHOLD_KEY);
}
// setStoredHouseholdId, clearStoredHouseholdId — synchronous localStorage
```

### Supabase (`lib/supabase.ts`)

- `createClient(url, key)` — no custom auth storage (app doesn't use Supabase Auth)
- `isSupabaseConfigured` checks `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Realtime subscription on `buckets` table unchanged

### Business logic

`lib/buckets.ts`, `lib/household.ts`, `lib/format.ts`, `lib/types.ts` — copy with minimal changes (only import path adjustments if needed). No logic changes.

## PWA Configuration

`vite-plugin-pwa` in `vite.config.ts`:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icons/*.png'],
  manifest: {
    name: 'Budgethinkar',
    short_name: 'Budgethinkar',
    description: 'Gemensamma budgethinkar för dig och din sambo',
    theme_color: '#1B6B4A',
    background_color: '#F4F7F5',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    // No runtime caching of Supabase API — online only
  },
})
```

Service worker precaches the built app shell. Supabase requests always go to the network.

## Vercel Deployment

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (set in Vercel dashboard)
- **Framework preset:** Vite

## Feature Parity Checklist

- [ ] Create household with name
- [ ] Join household with 8-char code
- [ ] Persist household ID in localStorage
- [ ] List buckets with balances
- [ ] Add new bucket
- [ ] Adjust bucket balance (+/−)
- [ ] Delete bucket (with confirmation)
- [ ] Show total balance across buckets
- [ ] Share household code (Web Share API + clipboard fallback)
- [ ] Leave household (with confirmation)
- [ ] Realtime sync when partner makes changes
- [ ] Supabase-not-configured error screen
- [ ] PWA installable on iOS Safari and Android Chrome

## Error Handling

- Network/Supabase errors: show user-facing Swedish message (same copy as today)
- Invalid amount on adjust: inline validation message (replaces `Alert.alert`)
- Destructive actions (delete bucket, leave household): `window.confirm()` with same Swedish text
- Missing env vars: dedicated screen on `/` (same message as current index screen)

## Out of Scope

- Offline data read/write
- Supabase Auth / user accounts
- Push notifications
- Transaction history / audit log
- Multi-household support per device
- iOS/Android native apps

## Test Plan

1. `npm run dev` — app loads, redirects to `/setup` when no household stored
2. Create household → lands on `/home` with empty bucket list
3. Add bucket "Mat" → appears in list
4. Adjust +500 → balance updates
5. Open second browser/incognito → join with share code → sees same buckets
6. Adjust in browser A → browser B updates via realtime
7. Delete bucket → removed for both
8. Leave household → back to `/setup`, household ID cleared
9. `npm run build && npm run preview` — production build works
10. Install PWA on phone → launches standalone, features work online
