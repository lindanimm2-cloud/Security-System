# 4DS Security Assurance Roadmap

Engineering-owned roadmap for Nest/Next/Prisma. See also [POSITIONING.md](./POSITIONING.md).

## Target posture

Build toward a **government / critical-operations-grade architecture** for private security first, then high-assurance deployments—without claiming certifications prematurely.

## Phase overview

| Phase | Focus | Status |
|-------|--------|--------|
| **1 Foundation** | MFA, RBAC/scoping, sessions, encryption basics, audit logging, secrets hygiene, backups, rate limiting, API authz | **Shipped (scaffolding)** |
| **2 Operational integrity** | Evidence chain of custody, immutable audit, incident timeline, offline sync cursors | **Shipped (scaffolding)** |
| **3 Enterprise security** | Vuln register, SIEM export, SBOM/DR docs, passkeys planned | **Shipped (scaffolding)** |
| **4 Assurance** | POPIA / ISMS / NIST docs + internal audit checklist | **Docs shipped** |
| **5 Gov / critical deployments** | STANDARD / ENTERPRISE / HIGH_ASSURANCE profiles + supplier checklist | **Shipped (scaffolding)** |

“Shipped (scaffolding)” means product controls and documentation exist in-repo. It does **not** mean ISO/POPIA/government certification, completed pen-tests, or measured contractual RPO/RTO.

## Product entry point

Control Room → **Assurance** (`/control-room/assurance`)

API prefix: `/v1/control-room/assurance`

## Doc index

| Doc | Phase |
|-----|-------|
| [BACKUP_RUNBOOK.md](./BACKUP_RUNBOOK.md) | 1 / Recover |
| [PHASE3_ENTERPRISE.md](./PHASE3_ENTERPRISE.md) | 3 |
| [SBOM.md](./SBOM.md) · [DR_TEST_CHECKLIST.md](./DR_TEST_CHECKLIST.md) | 3 |
| [PHASE4_ASSURANCE.md](./PHASE4_ASSURANCE.md) · POPIA / ISMS / NIST / internal audit | 4 |
| [PHASE5_PROFILES.md](./PHASE5_PROFILES.md) | 5 |
| [PERSISTENT_OPERATIONAL_MODE.md](./PERSISTENT_OPERATIONAL_MODE.md) | Officer Duty Mode (ops integrity) |

## NIST CSF 2.0 map (product)

See [NIST_CSF_CONTROL_MATRIX.md](./NIST_CSF_CONTROL_MATRIX.md).

## What exists vs gaps (snapshot)

| Area | Exists today | Remaining gap |
|------|--------------|---------------|
| Auth | JWT, bcrypt, TOTP MFA (otplib) | Passkeys / WebAuthn |
| RBAC | RolesGuard + TenantGuard + branch-scope helper | Permission matrix enforcement everywhere |
| Audit | Hash-chained SecurityAuditEvent + DB append-only triggers | External WORM / SIEM retention proof |
| Evidence | SHA-256 + custody hash on incident media | Legal hold / e-discovery packs |
| Rate limit | Nest Throttler | Redis multi-node |
| Profiles | STANDARD / ENTERPRISE / HIGH_ASSURANCE | Customer contract binding + assessments |
| Vulns | In-app register | Scanner integrations |
| Offline | Sync cursor API | Full field offline pack sync |
| Assurance docs | POPIA/ISMS/NIST/internal audit | External audit engagement |

## Two tracks

```text
TECHNICAL READINESS          SUPPLIER READINESS
Security / Audit             Company compliance
Reliability                  CSD / tax / B-BBEE (as applicable)
Evidence / Testing           Insurance / SLA / support
Documentation                Tender packs / references
```
