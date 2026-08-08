# 4DS Solutions Mobile Protection Platform

Production-ready SaaS platform for mobile personal security, real-time GPS tracking, panic response, theft recovery, and AI-assisted emergency guidance.

## Architecture Documentation

| Document | Description |
|----------|-------------|
| [System Architecture](./docs/ARCHITECTURE.md) | High-level design, engines, multi-tenancy, scalability |
| [Database Schema](./docs/DATABASE_SCHEMA.md) | Full entity model, tables, relationships, Prisma reference |
| [API Specification](./docs/API_SPECIFICATION.md) | REST endpoints, WebSocket events, rate limits |
| [Development Roadmap](./docs/DEVELOPMENT_ROADMAP.md) | 12-phase implementation plan |

## Tech Stack

- **Mobile:** React Native (iOS + Android)
- **Admin:** Next.js
- **Backend:** Node.js + NestJS
- **Database:** PostgreSQL + Prisma ORM
- **Real-time:** Socket.io + Redis
- **Push:** Firebase Cloud Messaging
- **Maps:** Google Maps Platform
- **Auth:** JWT (access + refresh rotation)
- **AI:** OpenAI API with function calling

## Target Scale

Designed for **100,000+ registered users** with 15k concurrent WebSocket connections and 5k location updates/second.

## Monorepo Structure (Planned)

```
apps/mobile     → React Native consumer app
apps/admin      → Next.js control room dashboard
apps/api        → NestJS backend
packages/       → Shared types and validation
infrastructure/ → Docker, Terraform, Kubernetes
docs/           → Architecture and specifications
```

## Getting Started (Localhost)

**Prerequisites:** Node.js 20+, Docker Desktop

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL + Redis
npm run db:up

# 3. Migrate and seed database
npm run db:migrate
npm run db:seed

# 4. Start dev servers (two terminals)
npm run dev:api    # http://localhost:4000/v1
npm run dev:admin  # http://localhost:3000
```

| Service | URL |
|---------|-----|
| Home (choose portal) | http://localhost:3000 |
| Client Portal Login | http://localhost:3000/portal/login |
| Officer App Login | http://localhost:3000/officer/login |
| Client Dashboard | http://localhost:3000/portal |
| Control Panel Login | http://localhost:3000/login |
| Control Room Dashboard | http://localhost:3000/control-room |
| API Health | http://localhost:4000/v1/health |

**Demo logins** (tenant: `demo`, password: `Demo123!`):
- Client: `client@demo.local`
- Admin: `admin@demo.local`

## License

Proprietary — All rights reserved.
