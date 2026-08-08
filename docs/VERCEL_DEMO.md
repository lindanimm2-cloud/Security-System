# Vercel pitch demo (free)

Repo: https://github.com/lindanimm2-cloud/Security-System

## 1. Deploy the frontend (Vercel Hobby — free)

1. Open [vercel.com/new](https://vercel.com/new) and sign in with **GitHub** (`lindanimm2-cloud`).
2. **Import** `Security-System`.
3. Settings:
   - **Root Directory:** leave blank (monorepo root) — `vercel.json` already builds `@4ds-solutions/admin`
   - **Framework:** Next.js (auto)
   - **Install:** `npm install`
   - **Build:** `npm run build -w @4ds-solutions/admin`
4. Add Environment Variable (Production):
   - `NEXT_PUBLIC_API_URL` = `https://YOUR-API-HOST/v1`  
     (set this after step 2; without it, store/login/portals cannot talk to the backend)
5. Deploy → you get a free `*.vercel.app` URL for the pitch.

## 2. Deploy the API + DB (needed for a live pitch)

Vercel hosts the **Next.js site** well. The **NestJS API + Postgres** need a second free host, e.g.:

| Piece | Free option |
|--------|-------------|
| Postgres | [Neon](https://neon.tech) or [Supabase](https://supabase.com) |
| API (`apps/api`) | [Render](https://render.com) Web Service or [Railway](https://railway.app) |

### API env (minimum)

Copy from `apps/api/.env.example` and set at least:

- `DATABASE_URL` — Neon/Supabase connection string
- `JWT_SECRET` — long random string
- `CORS_ORIGIN` — your Vercel URL (e.g. `https://security-system.vercel.app`)
- `PORT` — as required by the host (often `10000` on Render)

After deploy:

```bash
npx prisma migrate deploy
npx prisma db seed
```

(from `apps/api` with `DATABASE_URL` set)

Then set Vercel `NEXT_PUBLIC_API_URL` to `https://your-api.onrender.com/v1` (or equivalent) and **redeploy** the frontend.

## 3. Pitch smoke checklist

1. `/` home + `/store` catalog + WhatsApp / AI dock  
2. `/portals` employee hub  
3. Login: tenant `demo` / password `Demo123!`  
4. Invite: `NX-DEMO01`  
5. Control room + client portal after login  

## Demo credentials (seed)

- Tenant: `demo`
- Password: `Demo123!`
- Invite: `NX-DEMO01`

Do **not** commit real `.env` / `.env.local` files.
