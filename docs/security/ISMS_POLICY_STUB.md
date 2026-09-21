# Information security policy stub (ISMS)

**Status:** Draft for board / owner approval — not an ISO certificate.

## Purpose

Protect confidentiality, integrity, and availability of 4DS Field Operations data and systems for customers and field staff.

## Scope

Production deployments of the Nest API, Next admin apps, PostgreSQL, uploads storage, and supporting integrations.

## Commitments

1. Access is role- and tenant-based; privileged accounts use MFA
2. Security events are logged append-only where enabled
3. Evidence files are integrity-hashed (SHA-256) when uploaded
4. Secrets are not committed to source control; production rejects weak defaults
5. Backups and restore drills follow [BACKUP_RUNBOOK.md](./BACKUP_RUNBOOK.md)
6. Vulnerabilities are tracked in the product register and remediated by severity
7. Incidents are handled via product workflows plus this policy’s escalation contacts

## Roles

| Role | Responsibility |
|------|----------------|
| Owner / Tenant admin | Policy approval, assurance profile |
| Control room leads | Operational adherence |
| Developer / platform | Secure change, dependency hygiene |
| All staff | Report suspected incidents |

## Review

Review at least annually, or after material incidents / architecture changes.
