# Vercel pitch demo (free, no Nest API)

Repo: https://github.com/lindanimm2-cloud/Security-System

## One-click pitch mode (recommended)

Demo mode is **baked into the Next.js build** by default (`next.config.ts`).
No Nest API, no Postgres, no Render — products + login work on Vercel alone.

If a browser asks to “access other apps/services on this device”, click **Block** —
that was the old localhost API probe. New deploys do not request it.

### Deploy
1. [vercel.com/new](https://vercel.com/new) → import **Security-System**
2. Root = repo root (leave blank)
3. Deploy — done

### Demo credentials
| Portal | Email | Password | Tenant |
|--------|-------|----------|--------|
| Control room | `admin@demo.local` | `Demo123!` | `demo` |
| Client | `client@demo.local` | `Demo123!` | `demo` |
| Officer | `ndlovu@4ds.local` | `Demo123!` | `demo` |
| Technician | `tech.cameras@4ds.local` | `Demo123!` | `demo` |
| Invite | `NX-DEMO01` | — | — |

A red **Pitch demo mode** banner appears while demo mode is on.

### Local with demo mode
```bash
# apps/admin/.env.local
NEXT_PUBLIC_DEMO_MODE=true
npm run dev -w @4ds-solutions/admin
```

### Later: real API
Set `NEXT_PUBLIC_DEMO_MODE=false` and `NEXT_PUBLIC_API_URL=https://your-api/v1` in Vercel env, then redeploy.

Do **not** commit real `.env` / `.env.local` files.
