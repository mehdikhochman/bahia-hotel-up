# Bahia — Hôtel Boutique · Assinie Terminal

Production-ready full-stack Next.js 14 app for the Bahia boutique hotel on the Assinie peninsula, Côte d'Ivoire.

## Stack

| Layer          | Tech                                                                |
| -------------- | ------------------------------------------------------------------- |
| Framework      | **Next.js 14** App Router · RSC · Server Actions · middleware       |
| Language       | **TypeScript** (strict)                                             |
| UI             | **Tailwind CSS** · **Framer Motion** · **Lucide React**             |
| Database       | **PostgreSQL** · **Prisma 5**                                       |
| Validation     | **Zod** (shared client/server)                                      |
| Auth           | Hand-rolled JWT in httpOnly cookie via **jose** + **bcryptjs**      |
| Email          | **Resend** (transactional)                                          |
| SMS            | **Orange Côte d'Ivoire API** (transactional, optional)              |
| Rate limiting  | **Upstash Redis** (sliding window, optional)                        |
| Observability  | **Sentry** (optional, client + server + edge)                       |
| Storage        | **Vercel Blob** (prod) · disk fallback (dev), served via auth proxy |
| Deployment     | Vercel-ready                                                        |

## Démarrage local

```bash
cp .env.example .env
# Remplir au minimum :
#   DATABASE_URL
#   AUTH_SECRET            (openssl rand -base64 48)
#   SEED_ADMIN_EMAIL
#   SEED_ADMIN_PASSWORD

npm install
npm run db:push        # applique schema.prisma à PostgreSQL
npm run db:seed        # 4 hébergements + 1 admin user
npm run dev
```

→ Site public : http://localhost:3000
→ Espace staff : http://localhost:3000/admin/login

En dev sans `RESEND_API_KEY`, les emails sont logués en console (pas envoyés).
Sans `BLOB_READ_WRITE_TOKEN`, les scans d'ID sont écrits dans `.uploads/` (git-ignoré).

## Arborescence

```
app/
  layout.tsx
  page.tsx                          # RSC : SELECT rooms
  globals.css

  actions/
    booking.ts                      # createBooking, submitWaveReference + emails
    karaoke.ts                      # createKaraokeReservation
    availability.ts                 # getRoomAvailability (for calendar)

  api/
    upload/route.ts                 # POST multipart/form-data → Blob ou .uploads/

  checkout/[reference]/page.tsx     # Paiement Wave (RSC)

  legal/
    layout.tsx
    cgv/page.tsx                    # Conditions générales
    confidentialite/page.tsx        # RGPD / Loi 2013-450
    mentions-legales/page.tsx

  admin/                            # 🔒 protégé par middleware
    layout.tsx                      # Shell staff (sidebar)
    page.tsx                        # KPIs + raccourcis
    login/                          # JWT cookie-based
      page.tsx
      LoginForm.tsx
      actions.ts                    # signIn server action
    logout/route.ts
    actions.ts                      # confirm / reject booking, karaoke status
    bookings/
      page.tsx                      # liste filtrable + recherche
      [id]/page.tsx                 # détail + actions confirm/reject + lien scan ID
    karaoke/page.tsx                # liste groupée par samedi
    rooms/
      page.tsx                      # liste + actions toggle
      new/page.tsx                  # création
      [id]/page.tsx                 # édition + suppression défensive
      RoomForm.tsx
      actions.ts                    # create/update/toggle/delete
    api/scan/[bookingId]/route.ts   # 🔒 proxy authentifié des scans d'ID

  components/
    Navbar.tsx · Hero.tsx · Accommodations.tsx · Karaoke.tsx
    Experience.tsx · Footer.tsx · HomeShell.tsx
    BookingModal.tsx                # Wizard 4 étapes (KYC inclus)
    WaveCheckout.tsx                # Form QR + submission Wave ref
    QrPlaceholder.tsx

prisma/
  schema.prisma                     # User, AdminUser, Room, Booking, Identification,
                                    # Payment, KaraokeReservation
  seed.ts

lib/
  db.ts                             # Prisma singleton (hot-reload safe)
  auth.ts                           # Node-side: bcrypt + Prisma + cookies
  auth-jwt.ts                       # Edge-safe JWT helpers (middleware)
  email.ts                          # Resend templates (HTML inline)
  sms.ts                            # Orange CI SMS (OAuth2 + send)
  pricing.ts                        # VAT_RATE, CITY_TAX_*, computePricing()
  ratelimit.ts                      # Upstash sliding window
  storage.ts                        # Vercel Blob + .uploads/ adapter
  utils.ts                          # formatXOF, generateBookingReference, ...
  format.ts                         # date-fns helpers, status labels
  validation.ts                     # Zod schemas

sentry.client.config.ts
sentry.server.config.ts
sentry.edge.config.ts
instrumentation.ts                  # wires server/edge configs

middleware.ts                       # Protège /admin/*
types/index.ts
```

## Flux métier

### 1. Le voyageur réserve (KYC + Wave)

`BookingModal` wizard, 4 étapes :

1. **Séjour** — choix Villa / Chambre, dates, voyageurs (capacity check côté serveur)
2. **Voyageur** — nom, email, téléphone, nationalité
3. **Identité** — *obligatoire* : type (CNI / Passeport / Carte consulaire),
   numéro, téléversement (POST `/api/upload`), checkbox RGPD/Loi 2013-450
4. **Récap** — `createBooking()` Server Action valide via Zod, vérifie collision
   de dates, crée `Booking + Identification + Payment(PENDING)` en transaction,
   génère `BHA-YYMMDD-XXXXXX`, **envoie l'email "Réservation reçue"** au client
   et **notifie le staff**, redirige vers `/checkout/{reference}`.

### 2. Le voyageur paie via Wave

`/checkout/[reference]` :

- QR Wave (`NEXT_PUBLIC_WAVE_QR_URL` ou placeholder déterministe)
- Numéro Wave + montant exact, référence à copier
- Le voyageur paye puis colle son identifiant de transaction Wave
- `submitWaveReference()` passe le statut à `AWAITING_VERIFICATION`, **notifie
  le staff par email**, et envoie un accusé de réception au voyageur

### 3. Le staff vérifie et confirme

1. Le staff reçoit l'email "Paiement à vérifier"
2. Connexion à `/admin/login` (JWT 8h, httpOnly cookie)
3. Sur `/admin/bookings/[id]` : visualise la réservation, **clique "Voir la
   pièce"** (proxy authentifié `/admin/api/scan/[bookingId]`, accès journalisé)
4. Vérifie le paiement Wave côté app Wave Business
5. Clic **"Confirmer le paiement"** → booking `CONFIRMED`, payment `VERIFIED`,
   **email "Séjour confirmé"** au voyageur
6. Si paiement introuvable → **"Annuler"** avec motif, email d'annulation

### 4. Karaoké du samedi

`createKaraokeReservation()` refuse les non-samedi. Liste admin groupée par
date sur `/admin/karaoke` avec actions confirmer / annuler.

## Sécurité

| Surface                | Mesure                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| Auth staff             | JWT HS256 dans cookie httpOnly + sameSite=lax + secure en prod      |
| Brute force            | bcrypt cost 12 sur le password                                      |
| Routes admin           | `middleware.ts` matcher `/admin/:path*` → redirect login si pas JWT |
| Scans d'identité       | Proxy `/admin/api/scan/[bookingId]` jamais d'URL Blob exposée       |
| Upload                 | Validation MIME (`image/jpeg|png|webp`, `application/pdf`), 8 Mo    |
| RGPD                   | Checkbox + `acceptedAt` enregistrés dans `Identification`           |
| Audit                  | `console.log` audité sur consultation scan et confirm/reject        |
| CSRF                   | Next.js Server Actions vérifient l'Origin par défaut                |

## Email Resend

`lib/email.ts` envoie quatre types :

1. **Réservation reçue** — client + staff
2. **Paiement Wave soumis** — client (accusé) + staff (à vérifier)
3. **Séjour confirmé** — client
4. **Réservation rejetée** — client (avec motif)

Templates HTML inline (compatibles tous clients). Sans `RESEND_API_KEY`, log
console au lieu d'envoyer (pratique en dev).

Pour utiliser un domaine personnalisé dans `EMAIL_FROM` :
1. Ajouter le domaine `bahia-assinie.ci` dans Resend → DNS records
2. Valider SPF / DKIM / DMARC
3. Mettre à jour `EMAIL_FROM="Bahia <reservations@bahia-assinie.ci>"`

## Compliance ivoirienne / RGPD

Le modèle `Identification` (1-1 avec `Booking`) stocke :

- `fullName`, `idType` (`CNI` | `PASSPORT` | `CONSULAR_CARD`), `idNumber`
- `imageUrl` (Vercel Blob) + `imageKey` (clé de storage)
- `rgpdAccepted` + `acceptedAt`

L'accès aux scans passe **toujours** par `/admin/api/scan/[bookingId]` qui :

- vérifie le JWT admin via `requireAdmin()`
- charge la réservation, log l'accès (`audit`)
- fetch côté serveur l'URL Blob (jamais exposée au navigateur)
- streame le contenu avec `Cache-Control: private, no-store`

Pages légales : `/legal/cgv`, `/legal/confidentialite`, `/legal/mentions-legales`.

## Déploiement Vercel

```bash
# 1. Push GitHub
git init && git remote add origin git@github.com:you/bahia.git
git push -u origin main

# 2. Sur vercel.com → Import Project → bahia
#    Add Storage:
#      • Postgres (Neon ou Vercel)        → DATABASE_URL injecté
#      • Blob                              → BLOB_READ_WRITE_TOKEN injecté
#    Add Environment Variables:
#      AUTH_SECRET, NEXT_PUBLIC_SITE_URL,
#      NEXT_PUBLIC_WAVE_NUMBER, NEXT_PUBLIC_WAVE_MERCHANT_NAME, NEXT_PUBLIC_WAVE_QR_URL
#      RESEND_API_KEY, EMAIL_FROM, STAFF_EMAIL
#      SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME

# 3. Au premier deploy : Vercel exécute `prisma generate` (postinstall) + next build
# 4. Une fois en ligne :
vercel env pull .env.production.local
npm run db:push    # ou db:migrate deploy
npm run db:seed
```

## Scripts

```bash
npm run dev          # next dev
npm run build        # prisma generate && next build
npm run db:push      # sync schema (dev / staging)
npm run db:migrate   # créer + appliquer une migration prod
npm run db:seed      # rooms + admin (depuis SEED_ADMIN_*)
```

## Sprint 2 — livré

- ✅ **CRUD hébergements admin** (`/admin/rooms/new`, `/admin/rooms/[id]`) avec validation Zod, toggle actif, suppression défensive (désactive si bookings liés)
- ✅ **Calendrier de disponibilité visuel** dans le wizard de réservation — fetch des plages occupées par chambre, sélection cliquable, range highlight, dates passées/réservées désactivées
- ✅ **TVA 18 % + taxe de séjour** (500 XOF/pers/nuit) — helper `lib/pricing.ts` partagé client/serveur, breakdown visible dans le wizard, le checkout Wave, le détail admin, les emails
- ✅ **Rate limiting Upstash** sur `/api/upload`, login (per-IP et per-email), `createBooking`, `createKaraokeReservation`, `submitWaveReference` — no-op si pas configuré (dev)
- ✅ **SMS Orange CI** sur confirmation de réservation — `lib/sms.ts` avec OAuth2 client_credentials, no-op si pas configuré
- ✅ **Sentry** wiring conditionnel (client + server + edge runtime) — wrap auto si `SENTRY_DSN` présent

### Reportés Sprint 3

- Webhook / réconciliation auto Wave (Wave Business n'expose pas d'API publique de transactions individuelles — alternative : parsing SMS bancaire)
- i18n EN
- Tests E2E Playwright sur le flux critique
