# Development Roadmap
## 4DS Solutions Mobile Protection Platform

**Total Estimated Duration:** 9–12 months (team of 6–8)  
**MVP Target:** Month 4  
**Production Launch:** Month 8  
**Scale Hardening:** Month 9–12

---

## Team Structure (Recommended)

| Role | Count | Focus |
|------|-------|-------|
| Tech Lead / Backend | 1 | NestJS, architecture, DevOps |
| Backend Engineer | 1 | Engines, WebSocket, integrations |
| Mobile Engineer | 2 | React Native (iOS + Android) |
| Frontend Engineer | 1 | Next.js admin dashboard |
| DevOps / SRE | 1 | Infrastructure, CI/CD, monitoring |
| QA Engineer | 1 | Test automation, security testing |
| Product / UX | 1 | Flows, control room UX |

---

## Phase 0: Foundation (Weeks 1–3)

### Goals
Establish monorepo, CI/CD, dev environment, and shared contracts.

### Deliverables
- [ ] Turborepo monorepo with `apps/mobile`, `apps/admin`, `apps/api`, `packages/shared-types`
- [ ] Docker Compose: PostgreSQL 16 + PostGIS, Redis, MinIO (S3 local)
- [ ] NestJS project scaffold with module structure (empty modules, no business logic yet)
- [ ] Prisma setup with initial migration: `tenants`, `users`, `refresh_tokens`
- [ ] Next.js admin scaffold with auth layout shell
- [ ] React Native scaffold with navigation shell
- [ ] ESLint, Prettier, Husky pre-commit hooks
- [ ] GitHub Actions: lint, typecheck, test on PR
- [ ] Environment variable management (`.env.example` for each app)
- [ ] Shared TypeScript types package for enums and DTOs

### Exit Criteria
All three apps boot locally; API connects to PostgreSQL; CI passes on empty test suite.

---

## Phase 1: Authentication & Multi-Tenancy (Weeks 4–6)

### Goals
Secure identity layer with tenant isolation.

### Backend
- [ ] Auth module: register, login, refresh, logout
- [ ] JWT strategy with access + refresh rotation
- [ ] Tenant middleware and `TenantGuard`
- [ ] RBAC guards (`RolesGuard`)
- [ ] Officer and admin separate login flows
- [ ] Password reset, email verification
- [ ] Rate limiting on auth endpoints
- [ ] Audit log for admin actions

### Admin Dashboard
- [ ] Login page with tenant subdomain support
- [ ] Auth context + protected routes
- [ ] Basic tenant settings page

### Mobile
- [ ] Login / register screens
- [ ] Secure token storage (Keychain / EncryptedSharedPreferences)
- [ ] Auth state management
- [ ] Biometric unlock option

### Exit Criteria
Users can register, login, and access tenant-scoped resources. RBAC enforced on all routes.

---

## Phase 2: User Profile, Devices & Emergency Contacts (Weeks 7–8)

### Goals
Core user data management.

### Backend
- [ ] Users CRUD (self + admin)
- [ ] Devices module with FCM token registration
- [ ] Emergency contacts CRUD + reorder
- [ ] Avatar upload to S3
- [ ] Phone verification (OTP via Twilio)

### Mobile
- [ ] Profile screen (view/edit)
- [ ] Emergency contacts management
- [ ] Device registration on app launch
- [ ] Push notification permission flow

### Admin
- [ ] User list with search/filter
- [ ] User detail view

### Exit Criteria
Complete user onboarding flow from registration to profile with emergency contacts.

---

## Phase 3: Tracking Engine (Weeks 9–11)

### Goals
Real-time and historical GPS tracking at scale.

### Backend
- [ ] WebSocket gateway with Redis adapter
- [ ] `location:update` handler with validation
- [ ] Redis GEO for hot positions
- [ ] Tracking history batch writer (BullMQ job)
- [ ] Monthly partition setup for `tracking_history`
- [ ] REST batch endpoint for offline sync
- [ ] Live map API (active users GeoJSON)
- [ ] Location throttling (1/sec per client)

### Mobile
- [ ] Background location service (iOS + Android)
- [ ] Foreground service notification (Android)
- [ ] WebSocket connection manager with reconnection
- [ ] Offline location queue with batch sync
- [ ] Battery-optimized tracking intervals

### Admin
- [ ] Google Maps integration
- [ ] Live user map on control room (basic)

### Exit Criteria
1,000 simulated clients sending location updates; map renders in admin; history queryable.

---

## Phase 4: Incidents & Panic (Weeks 12–15) — MVP Core

### Goals
Panic button and incident lifecycle.

### Backend
- [ ] Incident engine with state machine
- [ ] Panic endpoint (idempotent)
- [ ] Theft report endpoint
- [ ] Incident timeline (immutable append)
- [ ] Auto-notification on panic (FCM + WebSocket)
- [ ] Emergency contact notification on panic
- [ ] Incident media upload

### Mobile
- [ ] Panic button (hold-to-confirm, haptic feedback)
- [ ] Panic works offline (queue + retry)
- [ ] Theft report form with vehicle details
- [ ] Incident history list + detail
- [ ] Active incident screen with status updates

### Admin
- [ ] Active incidents panel
- [ ] Incident detail with timeline
- [ ] Map pin for incident location

### Exit Criteria
End-to-end panic flow: mobile trigger → dispatch notification → admin sees incident on map within 3 seconds.

---

## Phase 5: Dispatch System (Weeks 16–19)

### Goals
Officer management and automated dispatch.

### Backend
- [ ] Officers CRUD
- [ ] Officer status management (available/busy/off-duty)
- [ ] Officer location tracking (WebSocket)
- [ ] Nearest officer algorithm (Redis GEO + PostGIS fallback)
- [ ] Auto-assign and manual assign
- [ ] Dispatch state machine
- [ ] Response time tracking (`dispatch_response_events`)
- [ ] Auto-dispatch on panic (configurable per tenant)

### Mobile (Officer flows — can be separate build target)
- [ ] Officer login
- [ ] Dispatch inbox (accept/decline)
- [ ] Navigation to incident (deep link to Maps)
- [ ] Status updates (en route, on scene)

### Admin
- [ ] Officer management CRUD
- [ ] Live officer map
- [ ] Dispatch panel (assign, reassign)
- [ ] Response time metrics

### Exit Criteria
Panic auto-assigns nearest available officer; full dispatch lifecycle trackable with response times.

---

## Phase 6: Family Tracking (Weeks 20–21)

### Goals
Family groups with shared location visibility.

### Backend
- [ ] Families module (create, join, manage)
- [ ] Family member permissions
- [ ] Family location API
- [ ] WebSocket `family:location` broadcasts

### Mobile
- [ ] Family setup and invite flow
- [ ] Family map view (member locations)
- [ ] Family alert notifications

### Exit Criteria
Family owner sees all members on map; members receive alerts when owner triggers panic.

---

## Phase 7: Notifications & Messaging (Weeks 22–24)

### Goals
Multi-channel notifications and in-app chat.

### Backend
- [ ] Notification engine (FCM, SMS fallback, email)
- [ ] Notification preferences
- [ ] Notification inbox API
- [ ] Conversations and messages module
- [ ] WebSocket chat events
- [ ] BullMQ notification delivery queue with retry

### Mobile
- [ ] Push notification handling (foreground + background)
- [ ] Notification inbox
- [ ] In-app messaging UI
- [ ] Deep linking from notifications

### Admin
- [ ] Initiate support conversation with user
- [ ] Incident-linked chat

### Exit Criteria
All incident/dispatch events deliver push notifications; users can chat with dispatch.

---

## Phase 8: Subscriptions & Billing (Weeks 25–27)

### Goals
Commercial monetization layer.

### Backend
- [ ] Subscription plans CRUD
- [ ] Stripe integration (checkout, portal, webhooks)
- [ ] Feature gating middleware (plan limits)
- [ ] Subscription status enforcement

### Admin
- [ ] Subscription management dashboard
- [ ] Plan configuration
- [ ] Revenue analytics (MRR, churn)

### Mobile
- [ ] Plan selection and checkout (WebView or Stripe SDK)
- [ ] Subscription status in profile
- [ ] Feature limits enforcement (family size, etc.)

### Exit Criteria
User can subscribe via Stripe; expired subscription restricts premium features.

---

## Phase 9: AI Assistant (Weeks 28–30)

### Goals
Intelligent security assistant with escalation.

### Backend
- [ ] AI module with OpenAI integration
- [ ] System prompts with safety guardrails
- [ ] Function calling: create_incident, escalate, notify_contact
- [ ] Crisis keyword detection → auto-escalation
- [ ] Conversation persistence
- [ ] SSE streaming endpoint
- [ ] Token usage tracking per tenant

### Mobile
- [ ] AI chat interface
- [ ] Quick action buttons ("I feel unsafe", "Report theft")
- [ ] Emergency escalation UI

### Exit Criteria
AI answers security questions, creates incidents via conversation, escalates critical situations to dispatch.

---

## Phase 10: Analytics & Theft Recovery (Weeks 31–33)

### Goals
Operational intelligence and specialized theft mode.

### Backend
- [ ] Analytics aggregation jobs (daily rollups)
- [ ] Dashboard KPIs API
- [ ] CSV export
- [ ] Theft recovery mode (enhanced tracking frequency)
- [ ] Recovery mode map API

### Admin
- [ ] Full control room dashboard
- [ ] Analytics charts (incidents, response times, subscriptions)
- [ ] Theft recovery dedicated view
- [ ] Officer performance reports

### Mobile
- [ ] Theft recovery mode UI (user + family tracking intensified)

### Exit Criteria
Control room dashboard shows real-time KPIs; theft recovery tracks vehicle/user at high frequency.

---

## Phase 11: Production Hardening (Weeks 34–38)

### Goals
Prepare for 100k+ users.

### Infrastructure
- [ ] Kubernetes deployment (EKS/GKE)
- [ ] PgBouncer connection pooling
- [ ] PostgreSQL read replicas
- [ ] Redis Cluster
- [ ] Auto-scaling policies (API, WS, workers)
- [ ] CDN for admin static assets
- [ ] WAF rules (Cloudflare/AWS)
- [ ] Secrets management (AWS Secrets Manager / Vault)

### Security
- [ ] Penetration testing
- [ ] OWASP audit
- [ ] PII encryption verification
- [ ] Certificate pinning (mobile)
- [ ] SOC 2 preparation checklist

### Performance
- [ ] Load test: 15k concurrent WebSocket connections
- [ ] Load test: 5k location updates/second
- [ ] Database query optimization (EXPLAIN ANALYZE on hot paths)
- [ ] Tracking partition automation

### Observability
- [ ] Structured logging (Pino → Datadog)
- [ ] Prometheus metrics + Grafana dashboards
- [ ] OpenTelemetry tracing
- [ ] PagerDuty alerting rules
- [ ] Runbooks for incident response

### Exit Criteria
Platform passes load tests at 2x expected launch capacity; security audit complete.

---

## Phase 12: Launch & Iteration (Weeks 39–42)

### Goals
Staged rollout and monitoring.

- [ ] Staging environment full parity with production
- [ ] Beta program with 1–2 pilot tenants
- [ ] App Store + Google Play submission
- [ ] Documentation: API docs (Swagger), admin user guide
- [ ] On-call rotation established
- [ ] Feature flags for gradual rollout
- [ ] Post-launch monitoring dashboards

---

## MVP Definition (End of Phase 5)

Minimum viable product includes:

| Feature | Included |
|---------|----------|
| User registration & auth | ✅ |
| Panic button | ✅ |
| Live GPS tracking | ✅ |
| Emergency contacts | ✅ |
| Push notifications (panic) | ✅ |
| Admin control room (basic map + incidents) | ✅ |
| Officer management | ✅ |
| Auto-dispatch nearest officer | ✅ |
| Incident history | ✅ |
| Family tracking | ❌ (Phase 6) |
| Theft reporting | ❌ (Phase 4 partial — basic only) |
| In-app messaging | ❌ (Phase 7) |
| Subscriptions | ❌ (Phase 8) |
| AI Assistant | ❌ (Phase 9) |
| Analytics | ❌ (Phase 10) |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Background location killed by OS | High | Foreground service, geofence fallback, educate users |
| WebSocket scale bottlenecks | High | Redis adapter early; dedicated WS nodes |
| Panic false alarms | Medium | Hold-to-confirm; dispatcher verification step |
| OpenAI latency in emergencies | High | Crisis keywords bypass AI → direct dispatch |
| Multi-tenant data leak | Critical | Tenant guard on every query; integration tests |
| App Store location permission rejection | Medium | Clear justification strings; optional tracking |

---

## Technology Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tool | Turborepo + pnpm | Fast builds, shared packages |
| Mobile framework | React Native (Expo dev builds) | Single codebase, OTA updates |
| Admin framework | Next.js 14 App Router | SSR, API routes, React ecosystem |
| Backend pattern | Modular monolith | Faster MVP; extract services later |
| Real-time | Socket.io + Redis | Proven scale, room semantics |
| Queue | BullMQ | Redis-backed, NestJS integration |
| Maps | Google Maps Platform | Best coverage for SA market |
| Payments | Stripe | Industry standard SaaS billing |
| State (mobile) | Zustand | Lightweight, less boilerplate than Redux |
| State (admin) | TanStack Query + Zustand | Server state + UI state separation |

---

## Post-Launch Roadmap (Months 10–18)

| Quarter | Features |
|---------|----------|
| Q1 post-launch | Dedicated officer app, geofencing alerts, wearable panic button BLE |
| Q2 | White-label tenant branding, API for third-party integrations |
| Q3 | Multi-region deployment, enterprise SSO (SAML), schema-per-tenant option |
| Q4 | Predictive dispatch (ML), integration with local law enforcement APIs |

---

## Definition of Done (Per Feature)

- Unit tests for business logic (>80% coverage on engines)
- Integration tests for API endpoints
- RBAC verified for all endpoints
- Tenant isolation tested
- Mobile tested on iOS 16+ and Android 12+
- Admin responsive down to 1280px
- API documented in OpenAPI/Swagger
- No PII in application logs
- Feature flagged for staged rollout
