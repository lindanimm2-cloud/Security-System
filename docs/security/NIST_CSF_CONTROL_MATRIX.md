# NIST CSF 2.0 — control matrix (product)

| Function | Category (abbrev.) | 4DS control / artefact |
|----------|--------------------|-------------------------|
| Govern | GV.OC / GV.RM | POSITIONING, ASSURANCE_ROADMAP, assurance profiles |
| Identify | ID.AM | Users, devices, CCTV/alarm kits, vulnerability register |
| Identify | ID.RA | Vuln register + risk notes in docs |
| Protect | PR.AA | MFA (otplib), RolesGuard, TenantGuard, branch scope helper |
| Protect | PR.DS | MFA secret encryption, evidence SHA-256 |
| Protect | PR.PS | Throttler, secrets hygiene |
| Detect | DE.CM | SecurityAuditEvent + SIEM export |
| Respond | RS.MA | Incidents, panic, lockdown, dispatch |
| Recover | RC.RP | BACKUP_RUNBOOK, DR_TEST_CHECKLIST |

Update this matrix when controls ship. Mapping ≠ certification.
