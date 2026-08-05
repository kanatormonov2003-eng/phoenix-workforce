# Phoenix Workforce Control: production readiness

## Status

The hardening branch addresses the highest-risk application issues: least-privilege RLS, controlled shift RPCs, admin guards, soft-delete archiving, Telegram test isolation, and a durable notification job schema.

## Fixed in this branch

- Removed committed Telegram credentials from `.env.example`.
- Operators cannot write shifts directly.
- Admin-only reports and block operations are guarded inside `SECURITY DEFINER` functions.
- Profiles, approvals, notification logs, and audit logs use narrower policies.
- Operator deletion archives records and bans the auth account instead of cascading history deletion.
- Added `notification_jobs` with retry-oriented state fields.
- Telegram test sending uses the database-configured chat and a fixed message, with timeout and generic errors.
- Added CI for lint, typecheck, build, and Supabase DB lint.

## BLOCKED: manual actions

1. Rotate the Telegram bot token in BotFather. The old token appeared in repository history and must be considered compromised.
2. Configure `TELEGRAM_BOT_TOKEN` and `CRON_SECRET` in Supabase Secrets.
3. Remove old leaked secrets from GitHub history using an approved repository-admin procedure.
4. Run the migration against a disposable Supabase project first, then production with a backup.
5. Configure Supabase Auth production URLs, MFA for admins, SMTP, database backups, and alerting.
6. Complete RLS integration tests using real JWT claims.

## Remaining risks

- A worker still needs to claim and deliver `notification_jobs` with exponential backoff.
- Existing frontend timezone formatting and pagination need a separate coordinated change.
- PostgreSQL and Edge Function versions must be validated in staging.

## Deployment checklist

- [ ] token rotated and secrets configured
- [ ] migration tested and backed up
- [ ] RLS tests pass
- [ ] CI green
- [ ] admin MFA enabled
- [ ] monitoring and backups verified
- [ ] smoke test: login, start shift, end shift, archive operator, Telegram test
