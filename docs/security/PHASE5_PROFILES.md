# Phase 5 — Deployment profiles & supplier readiness

## Profiles (enforced in product settings)

| Profile | Intent |
|---------|--------|
| **STANDARD** | Private security company baseline |
| **ENTERPRISE** | Multi-branch; dispatcher MFA; SIEM; longer retention |
| **HIGH_ASSURANCE** | Government / critical-ops **target** posture — stricter MFA, audit chain, supplier pack required. **Not a government certification.** |

Change profile in Control Room → Assurance. Raising profile turns on related MFA flags in tenant security settings.

## Supplier readiness (track)

Checklist for tender / CSD-style packs (company work, not software alone):

- [ ] Company registration / tax compliance artefacts current
- [ ] Insurance certificates
- [ ] SLA / support model
- [ ] Security questionnaire answers aligned to [POSITIONING.md](./POSITIONING.md)
- [ ] Reference deployments / case studies
- [ ] Software escrow / IP agreements as required by customer

Product link: Assurance checklist flags `supplierPackRequired` for HIGH_ASSURANCE.
