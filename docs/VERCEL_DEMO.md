# Vercel demo checklist (do not push secrets)

## Apps
- Frontend: `apps/admin` (Next.js) — store, site, portals, control room
- API: `apps/api` (NestJS) — must be deployed separately; set `NEXT_PUBLIC_API_URL`

## Env (Vercel project → Environment Variables)
- `NEXT_PUBLIC_API_URL` = public API origin including `/v1`
  - Local: `http://localhost:4010/v1`
  - Demo: `https://<your-api-host>/v1`

## Root `vercel.json`
Points install/build at the admin workspace. Confirm Root Directory in Vercel is the monorepo root (or adjust config if you set Root Directory to `apps/admin`).

## Smoke after deploy
1. `/` home + `/store` catalog
2. `/portals` → employee hub
3. `/portal/login` — invite links wrap; Google/Apple stacked with gap
4. Control room sidebar scrolls when nav is long
5. Page scroll works on store, login, portals

## Demo credentials (seed)
- Tenant: `demo`
- Password: `Demo123!`
- Invite: `NX-DEMO01`
- Owner: `owner@4ds.local` · Client via portal seed users
