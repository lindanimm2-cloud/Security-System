# Backup & restore runbook (Phase 1)

Operational checklist for the PostgreSQL + uploads store used by 4DS Nexus. This is an ops procedure, not a certification claim.

## What to back up

| Asset | Location | Notes |
|-------|----------|-------|
| Database | PostgreSQL (`DATABASE_URL`) | Includes users, MFA ciphertext, audit events, incidents |
| Uploads | `apps/api/uploads` (or configured volume) | Incident evidence / media |
| Secrets | Deploy secrets store | `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, DB credentials — never in git |

## Daily / nightly (recommended)

1. Take a PostgreSQL dump (`pg_dump` custom or SQL format) to encrypted object storage.
2. Sync the uploads volume to the same retention set.
3. Verify the dump file size is non-zero and retention policy still holds.

## Restore drill (quarterly)

1. Provision a scratch database and restore the latest dump.
2. Point a staging API at the scratch DB with staging secrets.
3. Smoke-test: admin login, MFA challenge path, one incident list, one media file.
4. Record date, operator, pass/fail in the ops log.

## MFA encryption key rotation

`MFA_ENCRYPTION_KEY` encrypts TOTP secrets at rest. Rotating it requires a planned re-encrypt job (not yet automated). Treat key loss as permanent MFA secret loss for enrolled users.

## RPO / RTO targets (working assumptions)

- **RPO:** ≤ 24h until nightly backups are proven more frequent
- **RTO:** staging restore within one business day; production target TBD per customer SLA
