# Production checklist

## DONE

- [x] Least-privilege RLS and protected security-definer RPCs
- [x] Direct operator shift writes removed
- [x] Soft-delete operator archive preserves history
- [x] Telegram worker with lock-based claiming, 8-second timeout, HTML escaping, retry/backoff, and dead jobs
- [x] Private notification queue and service-role-only worker RPC grants
- [x] Staging-only migration workflow with graceful missing-secret handling
- [x] Typed Supabase client contract and safer unknown error normalization
- [x] PR #7 updated with security checklist

## BLOCKED

- [ ] Real CI result until GitHub Actions runs on the updated commit
- [ ] Staging migration without `SUPABASE_ACCESS_TOKEN` and `SUPABASE_STAGING_PROJECT_REF`
- [ ] Telegram delivery without `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, and scheduler setup
- [ ] Token compromise remediation until BotFather rotation and Git history cleanup
- [ ] RLS/Edge integration tests without real admin/operator JWTs

## MANUAL STEPS

1. Rotate the old Telegram token in BotFather.
2. Remove leaked values from Git history using repository-admin access.
3. Add staging secrets to the protected GitHub `staging` environment.
4. Add Supabase secrets and deploy `telegram-worker`.
5. Configure a once-per-minute scheduler with `x-cron-secret`.
6. Run staging migration, RLS tests, smoke tests, backups, monitoring, and admin MFA before merge.
