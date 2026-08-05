# Staging deployment

This workflow applies migrations only to the Supabase project referenced by `SUPABASE_STAGING_PROJECT_REF`. It never reads production credentials.

## Required GitHub configuration

Create a GitHub environment named `staging` and add:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_STAGING_PROJECT_REF`

Protect the environment with required reviewers before allowing `workflow_dispatch`.

## Workflow

`.github/workflows/staging-migration.yml` runs on pull requests and manually. It executes:

1. `supabase --version`
2. `supabase link --project-ref $SUPABASE_STAGING_PROJECT_REF`
3. `supabase db lint`
4. `supabase db push --dry-run`
5. `supabase db push`

Fork pull requests do not receive secrets and are skipped by this workflow. The general security workflow still runs lint, typecheck, and build.

## Notification queue

Business RPCs insert a `pending` row into `notification_jobs`. `telegram-worker` calls `claim_notification_jobs()` using row locks and `SKIP LOCKED`, sends a server-generated Telegram message, then calls `complete_notification_job()`.

Failures retry after 1 minute, 5 minutes, 15 minutes, and 1 hour. The fifth failure becomes `dead`. A stale processing lock older than 10 minutes can be reclaimed.

The worker is intended to run once per minute with a Supabase Scheduler or an external scheduler sending `x-cron-secret`. The migration installs a pg_cron placeholder job only when the project is configured to invoke Edge Functions through its scheduler; do not put service-role secrets in SQL settings.

## Manual smoke test

- apply migration in a disposable project;
- invoke worker with the configured cron secret;
- verify `pending -> processing -> delivered`;
- disable Telegram and verify retry/dead behavior;
- verify operators cannot read or write queue rows.
