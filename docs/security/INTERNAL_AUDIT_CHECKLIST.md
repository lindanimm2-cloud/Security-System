# Internal audit checklist

Use quarterly. Mark Pass / Fail / N/A with evidence links.

1. Privileged users have MFA enrolled (sample 5 accounts)
2. Failed login / MFA failures appear in audit export
3. Incident evidence samples include `sha256Hash`
4. Assurance profile matches customer contract
5. Vulnerability register has no overdue Critical items
6. Backup restore drill completed within last 90 days
7. Production secrets are not default/dev values
8. Demo mode is not used for live customer PII
9. Branch-scoped roles cannot access other branch records (sample)
10. SIEM export pulled or webhook tested (ENTERPRISE+)

Sign-off: auditor · date · findings ticket IDs
