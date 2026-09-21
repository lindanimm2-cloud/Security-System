# Disaster recovery test checklist

Pair with [BACKUP_RUNBOOK.md](./BACKUP_RUNBOOK.md).

## Annual (minimum) drill

| Step | Pass? | Notes |
|------|-------|-------|
| Restore latest DB dump to scratch | | |
| Restore uploads volume sample | | |
| Boot API + admin against scratch | | |
| Admin login + MFA path | | |
| Open one incident + evidence hash present | | |
| SIEM export returns events | | |
| Record RTO achieved (wall clock) | | |
| Record RPO (age of backup used) | | |

Do not publish RPO/RTO as contractual guarantees until repeatedly measured for that environment.
