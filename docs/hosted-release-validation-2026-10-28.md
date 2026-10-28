# Hosted release validation — 28 October 2026

This hosted pass supersedes the earlier local-only deployment notes. Application release: 7ebb9f68d55a5baf65a0cb56dbc321cd7eb775a9 on main.

## Deployment

- Live URL: https://pethub.joaopaulo-grv4.workers.dev
- Cloudflare Worker pethub, version c3585f26-eaea-4c14-8b3b-12bc78779f1b, serving 100% of traffic; deployment eb48c874-809a-4b5a-a55e-8a4245b4247f.
- Existing Neon production database/auth configured through Worker secrets; Sentry secret preserved. Exact hosted origin trusted by Neon. Auth email application name updated to Zelupi.
- SITE_URL set to the actual hosted origin. PUSH_ENABLED remains false. No notifications sent.
- No Cloudflare Git build trigger exists. This release was uploaded with Wrangler; pushing main alone does not deploy future changes.
- Windows wrapper split the initial multiword deploy message into arguments; direct Wrangler deployment with OPEN_NEXT_DEPLOY=true succeeded. Temporary secret file removed after deployment.

## Local validation of the release source

- 369 tests in 61 files passed: broad run passed 358 tests/59 files, with two worker-startup timeouts; those two files passed separately (11 tests, one fork).
- Eight packaging fixture tests passed. TypeScript, brand-token consistency, Next production build, and OpenNext build passed.
- ESLint: no errors; two unused-disable warnings in generated Worker declarations.
- Staged credential scan: 239 files, no matches for private configured credential values; environment files excluded from Git.

## Hosted checks

- Home, welcome, account, manifest, Zelupi icon and service worker returned 200. Anonymous session returned 200/null; private cloud/card/push endpoints returned 401.
- Account and public-card responses use private/no-store. Public card also has no-referrer and noindex.
- Actual authorized email-code sign-in completed with a verified session. No existing password changed. Password recovery requested through the hosted UI; email arrived branded Zelupi, and its provider link returned 302 to the hosted /account with a recovery token. Final password submission was not exercised.
- 24 authenticated checks passed: snapshot create/read/update, stale update/delete conflicts, wrong-owner rejection, delete/recreate generation protection; managed card create/public read/update, stale revocation, token rotation and revocation.
- Synthetic snapshot removed; synthetic card payload cleared, retaining only the revocation tombstone by design. Existing data was guarded against overwrite. Test session signed out; old cookies returned null; private cookie file removed.
- Supported mutation methods on auth, snapshots, cards and push reject an external Origin with 403. Authenticated push configuration reported disabled.
- Hosted browser onboarding completed with synthetic data, creating Luna QA and a 4.2 kg weight. Profile and weight survived a full reload. Earlier local UI coverage of medications, documents, backups, PNG export and responsive layouts remains described in validation.md and zelupi-rebrand-validation.md.

## Remaining limits

This is evidence for the checks above, not a claim that every future feature is complete. New email/password registration and password replacement were not repeated against production during this pass. Real-device installation/update/offline behavior, cross-device acceptance and push delivery remain unverified; push stays disabled. Shared community, live catalogs, family/caregiver roles and billing remain prototypes or roadmap work. Managed identity deletion remains unavailable. The planned Zelupi custom domain is not registered or connected by this release.
