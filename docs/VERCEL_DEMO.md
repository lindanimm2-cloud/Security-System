# Vercel pitch demo (free, no Nest API)

Repo: https://github.com/lindanimm2-cloud/Security-System

## One-click pitch mode (recommended)

`NEXT_PUBLIC_DEMO_MODE=true` is set in root `vercel.json`.

That means the Next.js app on Vercel runs **fully offline**:
- Store catalogue (65 SKUs)
- Login for admin / client / officer / tech
- Main dashboards, map seed data, checkout, panic actions
- No Postgres, no Render, no Nest host required

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
