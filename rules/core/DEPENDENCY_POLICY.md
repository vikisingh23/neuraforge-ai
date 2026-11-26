# Dependency Policy

## Before Adding a Dependency

Ask these questions:

1. **Do we really need it?** Can we write 20 lines instead of adding a package?
2. **Is it maintained?** Last commit <6 months, issues responded to
3. **Is it popular?** >1000 weekly downloads, >100 GitHub stars
4. **Is the license compatible?** See allowed licenses below
5. **What's the size impact?** Check with `bundlephobia.com`
6. **Are there known vulnerabilities?** Check `npm audit` / `snyk`

## Allowed Licenses

| License | Status | Notes |
|---------|--------|-------|
| MIT | ✅ Allowed | Most permissive |
| Apache 2.0 | ✅ Allowed | Patent protection |
| BSD (2/3 clause) | ✅ Allowed | Permissive |
| ISC | ✅ Allowed | Equivalent to MIT |
| MPL 2.0 | ⚠️ Review | File-level copyleft |
| LGPL | ⚠️ Review | Library-level copyleft |
| GPL | ❌ Blocked | Full copyleft — infects your code |
| AGPL | ❌ Blocked | Network copyleft — even stricter |
| Unlicensed | ❌ Blocked | No legal right to use |

## Version Pinning

```json
// ✅ CORRECT — exact versions in production
"dependencies": {
  "express": "4.18.2",
  "@nestjs/core": "10.3.0"
}

// ❌ WRONG — open ranges
"dependencies": {
  "express": "^4.18.2",
  "@nestjs/core": "~10.3.0"
}
```

- **Lock files** (`package-lock.json`, `pubspec.lock`) MUST be committed
- **Renovate/Dependabot** for automated update PRs
- **Update quarterly** — don't let deps go stale

## Banned Packages

| Package | Why | Alternative |
|---------|-----|-------------|
| `moment` | Huge, deprecated | `date-fns` or `dayjs` |
| `lodash` (full) | 70KB for one function | `lodash-es` or native |
| `request` | Deprecated | `axios` or `node-fetch` |
| `node-uuid` | Deprecated | `uuid` |

## Audit Schedule

- **Weekly**: `npm audit` in CI (auto)
- **Monthly**: Review outdated deps (`npm outdated`)
- **Quarterly**: Full dependency review — remove unused, update major versions
- **On incident**: If a vulnerability is exploited, patch within 24 hours

## Rules

1. **Minimal dependencies** — every dep is a liability
2. **Pin exact versions** — no surprises in production
3. **Commit lock files** — reproducible builds
4. **No GPL in proprietary code** — legal risk
5. **Audit in CI** — fail on critical vulnerabilities
6. **Remove unused deps** — dead deps are attack surface

## Runtime baselines

Checked against vendor lifecycle pages in November 2026. Re-check each quarter.

| Runtime | Use for new work | Notes |
|---------|------------------|-------|
| .NET | **10 (LTS)**, supported to 14 Nov 2028 | .NET 11 (STS) is out. .NET 8 and 9 are out of support: plan upgrades, do not start new services on them |
| Node.js | **24 (LTS)** or 26 (LTS) | 22 is Maintenance only. 20 is end-of-life |
| React Native | Latest stable minus at most 2 minors (0.88 is latest) | Apps on 0.80 are 8 minors behind. Plan an upgrade. Upgrade one minor at a time using the upgrade helper |
| React | **19.3**. Never below the patched lines 19.0.1 / 19.1.2 / 19.2.1 | Dec 2025: critical unauthenticated remote code execution in React Server Components, then denial-of-service and source-exposure bugs. Frameworks that bundle Server Components (for example Next.js App Router) need their own vendor-patched release. Subscribe to security advisories |
| TypeScript | **7.x** (native compiler, about 10x faster than 6.0; 7.1 in beta) | Before upgrading a large repo, check that typed ESLint rules and build plugins work. Keep `strict` on. Faster type checks make a typecheck gate on every change practical |

Rules: new services use the current LTS. Existing services keep their runtime until a planned upgrade, but must not run an end-of-life runtime in production.

## Supply chain (OWASP A03:2025)

1. **Lock and verify.** Commit lock files. CI uses `npm ci` (not `npm install`). For .NET enable `RestorePackagesWithLockFile` and restore with `--locked-mode` in CI.
2. **Central versions.** .NET: `Directory.Packages.props` (Central Package Management) and NuGet package source mapping so internal package names cannot resolve from nuget.org (dependency confusion).
3. **Audit transitive deps.** `dotnet list package --vulnerable --include-transitive`, `npm audit --omit=dev`. Fail the pipeline on High/Critical.
4. **Install scripts.** Review packages that run `postinstall`. Use `--ignore-scripts` in CI where the build does not need them.
5. **New and typo-squat risk.** Before adding a package: check publisher, age, download history and repository link. Reject packages published in the last 14 days unless reviewed.
6. **SBOM.** Generate a CycloneDX SBOM per release and keep it with the artifact.
7. **Pin tooling.** Pin MCP servers, GitHub/GitLab Actions or CI images and build tools to exact versions or digests. No `@latest` or `npx -y` of unpinned packages in shared agent configs.
8. **Licence changes.** Several popular .NET libraries moved, or announced a move, to commercial licences in recent major versions (for example AutoMapper 15, MediatR 13, MassTransit 9, FluentAssertions 8). Check the licence before any major upgrade, and keep the approved version in the repo's dependency list.
