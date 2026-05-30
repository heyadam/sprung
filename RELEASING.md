# Releasing `sprung`

> Status: **never published.** `package.json` is at `0.0.0`; the first release will be `0.1.0`
> (an `initial` changeset is already committed). Everything below is the checklist to ship it —
> nothing here has been run against the live registry beyond `--dry-run`.

## 0. Before you publish — confirm these

- [ ] **Package name** is `sprungdesign` (the bare name `sprung` is rejected by npm's name-similarity policy). `npm view sprungdesign` → 404 confirms it's free.
- [ ] **Repository URL** in `package.json` (`repository`, `homepage`, `bugs`) currently points at
      `github.com/heyadam/sprung` — **replace with the real org/repo**. npm **provenance requires this to
      match** the GitHub repository the release workflow runs in, or publish fails.
- [ ] You have an npm account with publish rights and 2FA configured.

## 1. GitHub repo — ✅ done

Live at **https://github.com/heyadam/sprung** (public), `main` pushed, **CI green**.
CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → type-tests → build → publint + attw → size on every push/PR.

**One-time setting for the release flow:** enable **Settings → Actions → General →
"Allow GitHub Actions to create and approve pull requests."** Without it, the Changesets
workflow can't open the "Version Packages" PR and fails at that step — *harmlessly* (it
never publishes; it only pushes a `changeset-release/main` branch). With it enabled, each
push to `main` that contains a changeset opens/updates the version PR.

## 2. Authentication (pick one)

- **Trusted Publishing (OIDC) — recommended, token-free.** On npmjs.com, configure the package's trusted
  publisher to this repo's `release.yml`. Provenance is automatic; you can delete the `NODE_AUTH_TOKEN`
  line from `release.yml`. Note: the package must already exist, so the *very first* publish typically
  uses a token (below), after which you switch to OIDC.
- **Automation token.** Create an npm **Automation** access token and add it as the `NPM_TOKEN` repo secret.
  `release.yml` reads it via `NODE_AUTH_TOKEN`.

## 3. Release flow (Changesets)

**Automated (recommended):** `release.yml` is already wired up.
1. Merge/commit work to `main` with changesets (one is present: `.changeset/initial.md`).
2. The workflow opens a **"Version Packages"** PR that bumps `0.0.0 → 0.1.0` and writes `CHANGELOG.md`.
3. **Merge that PR.** The workflow then publishes to npm **with provenance**.

**Manual (if you prefer to drive it locally):**
```bash
npm run build
npx changeset version     # 0.0.0 → 0.1.0, generates CHANGELOG.md
git commit -am "release: 0.1.0"
npm publish               # honors publishConfig: { access: public, provenance: true }
git push --follow-tags
```
> Local provenance requires publishing from CI; a local `npm publish` will publish **without** a provenance
> attestation unless run in a supported CI with `id-token`. Prefer the automated flow for provenance.

## 4. Provenance — already configured

- `release.yml` sets `permissions: id-token: write` and `NPM_CONFIG_PROVENANCE: true`.
- `package.json` → `publishConfig: { access: "public", provenance: true }`.
- npm ≥ 9.5 required (local is 11.x). ✔

## 5. After publishing

- [ ] `npm view sprungdesign` shows `0.1.0`; the npm page shows the **provenance** badge.
- [ ] Smoke test: `npm i sprungdesign` in a scratch project; import `sprungdesign` and `sprungdesign/react`.
- [ ] Re-run `npx @arethetypeswrong/cli sprung` (against the published package) → all green.

## Quick reference

```bash
npm run build          # tsdown → dist (ESM + CJS + d.ts/d.cts)
npm run check:package  # publint + attw --pack
npm run size           # size-limit budget
npm pack --dry-run     # inspect the tarball without publishing
npm publish --dry-run  # full dry-run, no upload
```
