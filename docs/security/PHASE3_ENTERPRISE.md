# Phase 3 — Enterprise security controls

Engineering scaffolding. Not a pen-test report or certification.

## Delivered in product

| Control | Where |
|---------|--------|
| SIEM-oriented export | `GET /v1/control-room/assurance/siem-export?hours=24` |
| Vulnerability register | Assurance UI + `/assurance/vulnerabilities` |
| Assurance profiles | STANDARD / ENTERPRISE / HIGH_ASSURANCE |
| SBOM | See [SBOM.md](./SBOM.md) |
| DR testing | See [DR_TEST_CHECKLIST.md](./DR_TEST_CHECKLIST.md) |
| Passkeys | Tracked as **planned** (TOTP is live) |

## Still ops / people work

- External pen-test engagement and remediations
- MDM for field devices (device-security module is the product foundation)
- PAM for break-glass accounts
- Redis-backed throttling for multi-node

## SIEM hook contract

Export format: `4ds-siem-json-v1` — array of audit events with `eventHash` / `prevEventHash` for integrity checks. Forward to your SIEM via scheduled pull or future webhook.
