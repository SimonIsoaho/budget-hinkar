# Budgethinkar

En enkel webbapp (React PWA) för att hålla koll på gemensamma budgethinkar tillsammans med din sambo. Data synkas i realtid via Supabase.

## Funktioner

- Skapa ett hushåll och få en delningskod
- Din sambo går med med samma kod i webbläsaren
- Lägg till hinkar med namn (t.ex. Mat, Semester)
- Lägg till eller dra ifrån belopp i varje hink
- Ändringar syns direkt på båda enheterna
- Installera som PWA på mobil eller dator

## Kom igång

### 1. Skapa Supabase-projekt

1. Gå till [supabase.com](https://supabase.com) och skapa ett gratis projekt
2. Öppna **SQL Editor** och kör innehållet i `supabase/schema.sql`
3. Gå till **Project Settings → API** och kopiera:
   - Project URL
   - `anon` public key

### 2. Konfigurera miljövariabler

```bash
cp .env.example .env
```

Fyll i dina Supabase-värden i `.env`:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Starta appen

```bash
npm install
npm run dev
```

Öppna [http://localhost:5173](http://localhost:5173) i webbläsaren.

## Dela med din sambo

1. Den som skapar hushållet trycker **Dela kod** i appen
2. Skicka koden (8 tecken) till din sambo
3. Din sambo väljer **Gå med med kod** och matar in koden

## Installera som PWA

- **iPhone (Safari):** Dela → Lägg till på hemskärmen
- **Android (Chrome):** Meny → Installera app / Lägg till på startskärmen
- **Desktop (Chrome/Edge):** Installera-ikonen i adressfältet

## Deploy till Vercel

1. Pusha till GitHub och importera repot i [Vercel](https://vercel.com)
2. Lägg till miljövariablerna `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY`
3. Deploy — Vercel kör `npm run build` automatiskt

## Projektstruktur

```
src/
  pages/        Skärmar (React Router)
  components/   UI-komponenter
  lib/          Supabase, lagring, hjälpfunktioner
supabase/       SQL-schema
public/         PWA-ikoner och favicon
```

## Säkerhet

Appen använder en delningskod som "lösenord" till ert hushåll. Dela koden bara med personer du litar på. För ett privat par-hushåll räcker detta bra.
