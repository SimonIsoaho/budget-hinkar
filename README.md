# Budgethinkar

En enkel iOS-app (React Native + Expo) för att hålla koll på gemensamma budgethinkar tillsammans med din sambo. Data synkas i realtid via Supabase.

## Funktioner

- Skapa ett hushåll och få en delningskod
- Din sambo går med med samma kod på sin telefon
- Lägg till hinkar med namn (t.ex. Mat, Semester)
- Lägg till eller dra ifrån belopp i varje hink
- Ändringar syns direkt på båda telefonerna

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
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Starta appen

```bash
npm install
npm run ios
```

Du kan också skanna QR-koden med **Expo Go** på iPhone:

```bash
npm start
```

## Dela med din sambo

1. Den som skapar hushållet trycker **Dela kod** i appen
2. Skicka koden (8 tecken) till din sambo
3. Din sambo väljer **Gå med med kod** och matar in koden

## Bygga för TestFlight/App Store

```bash
npx eas build --platform ios
```

Kräver ett [Expo](https://expo.dev)-konto och Apple Developer-konto.

## Projektstruktur

```
app/           Skärmar (Expo Router)
components/    UI-komponenter
lib/           Supabase, lagring, hjälpfunktioner
supabase/      SQL-schema
```

## Säkerhet

Appen använder en delningskod som "lösenord" till ert hushåll. Dela koden bara med personer du litar på. För ett privat par-hushåll räcker detta bra.
