# SBOM (software bill of materials)

## Generate (local)

From the monorepo root (when network allows):

```bash
npx @cyclonedx/cyclonedx-npm --output-file docs/security/sbom-api.cdx.json --workspace apps/api
```

Or per-app:

```bash
cd apps/api && npx @cyclonedx/cyclonedx-npm --output-file ../../docs/security/sbom-api.cdx.json
```

Commit generated SBOMs only for release tags if your policy requires it; otherwise keep them in CI artefacts.

## Why

Supports Phase 3 Identify/Protect dependency awareness and customer security questionnaires. An SBOM is inventory evidence, not a vulnerability scan by itself — pair with the vulnerability register.
