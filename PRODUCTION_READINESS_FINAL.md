# Phoenix Workforce Control: Production Readiness Final

Date: 2026-08-05
Branch: `security/production-hardening`
Pull request: #7
Head reviewed: `3a9ca9c`

## Decision

**DO NOT MERGE yet.** The PR is open and unmerged, but CI is not green and the staging migration is not proven. The repository audit found one privilege-escalation risk and fixed it with a follow-up migration. GitHub Actions must be rerun on the new commit and the required staging secrets must be configured manually.

## Security score

- Before hardening: approximately **5/10**.
- Current source review: **7/10**.
- Merge-ready score: **not achieved** because CI, staging migration, live JWT/RLS tests, secret rotation, and worker deployment are still unverified.

## What was fixed in this audit

- Added `supabase/migrations/20260805030000_auth_role_hardening.sql`.
- New auth users are always created as `operator`; client-provided metadata can no longer self-assign `admin`.
- Re-revoked direct execution of the auth trigger function for public and authenticated roles.
- The fix was committed as `e1063a6` with message `security: prevent self-assigned admin role on signup`.

## CI status

At the reviewed PR head, all three visible checks were failing:

- `verify` on pull request: **failure**.
- `verify` on push: **failure**.
- `staging`: **failure**.

The public job pages expose annotations but require sign-in for step logs. The available data does not expose the first failing step, file, or line, so no CI code change was made blindly. The verify job order is `npm ci`, lint, typecheck, build, then `supabase db lint`; the job page reported 9 errors and 3 warnings, but not their source locations.

The staging workflow explicitly requires `SUPABASE_ACCESS_TOKEN` and `SUPABASE_STAGING_PROJECT_REF`. Those secrets cannot be inspected or created from this audit. **BLOCKED: manual GitHub environment secrets are required.**

## Verified checks from repository review

- `.env.example` contains placeholders only and no live Telegram token.
- Telegram worker reads `TELEGRAM_BOT_TOKEN` and `CRON_SECRET` only from server environment.
- Telegram test endpoints ignore client chat ID and message text, require an admin, escape HTML where applicable, and use an 8-second timeout.
- Queue rows are RLS-protected; claim and completion RPCs are intended for `service_role` only.
- Queue claim uses `FOR UPDATE SKIP LOCKED`, increments attempts, sets a lease, and supports retry backoff plus `dead` after the fifth failed attempt.
- RLS is enabled across the application tables and the queue; the hardening migration narrows operator writes.
- Security-definer functions reviewed in the hardening migration set `search_path = public` and admin report/block functions call the database-side admin guard.
- Migration order is deterministic: initial schema, hardening, queue worker, grants/RPC alias, auth role hardening.
- RLS and Edge test directories contain plans, not executable integration tests.

## Findings and remaining risks

1. **CI evidence is incomplete.** Exact failing step and source line are blocked by unavailable GitHub Actions logs. Rerun the checks on the new head and inspect the authenticated logs before changing code.
2. **Staging is blocked.** Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_STAGING_PROJECT_REF` to the protected `staging` environment, then run lint, dry-run, and apply against staging only.
3. **Telegram delivery is not live-verified.** Configure `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, deploy the worker, and configure an external scheduler or Supabase scheduler to POST once per minute with `x-cron-secret`.
4. **The migration's `phoenix-telegram-worker` cron entry is a placeholder that runs `select 1`; it does not invoke the Edge Function. Treat scheduler setup as mandatory, not complete.
5. **At-least-once delivery remains a design limitation.** A worker crash after Telegram accepts a message but before completion can cause a retry after the stale lease window. Concurrent claims are serialized with row locks, but exactly-once external delivery is not proven.
6. **Live authorization tests are missing.** Run disposable-project tests with real operator and admin JWTs for direct writes, cross-employee reads, RPC role checks, archived-account access, and edge-function auth.
7. **Previously exposed Telegram credentials remain compromised.** Rotate the bot token in BotFather and remove the secret from Git history using repository-admin procedures.
8. **Operational controls remain manual.** Admin MFA, backups, monitoring, alerting, Auth URLs, SMTP, and rollback rehearsal are not verifiable from repository access.

## Required before merge

- Rerun `security / verify` and both staging checks on the new commit.
- Confirm `lint`, `typecheck`, `build`, and `supabase db lint` pass, with authenticated job logs available.
- Configure staging secrets and obtain a successful dry-run and apply.
- Deploy and invoke the Telegram worker in staging, then verify pending, processing, delivered, retry, and dead transitions.
- Run executable RLS and Edge integration tests with disposable credentials.
- Rotate the compromised Telegram token and confirm the old token is revoked.
- Require human review of the migration and operational checklist.

**Final status: BLOCKED, not safe to merge.**