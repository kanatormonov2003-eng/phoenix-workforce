# Production status

## DONE

- Added typed Supabase database contract and generic client.
- Hardened RLS and protected security-definer RPC paths.
- Added soft-delete archive flow for operators.
- Added Telegram worker, queue claim/complete RPCs, retry/backoff, dead-letter state, timeout, and HTML escaping.
- Added staging-only migration workflow with graceful `BLOCKED` handling when secrets are absent.
- Added security and staging documentation.

## BLOCKED

- Real `npm run lint`, `npm run typecheck`, and `npm run build` require a runner with the repository checkout and dependencies.
- Staging migration requires GitHub environment secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_STAGING_PROJECT_REF`.
- Telegram delivery requires Supabase secrets `TELEGRAM_BOT_TOKEN` and `CRON_SECRET` plus a scheduler invocation.
- The previously exposed Telegram token must be revoked in BotFather and removed from Git history manually.

## NEXT

- Run the staging workflow and inspect migration output.
- Deploy `telegram-worker` and configure a protected once-per-minute scheduler.
- Execute RLS and Edge Function integration tests with real admin/operator JWTs.
- Enable admin MFA, production SMTP, backups, alerting, and review the PR before merge.
