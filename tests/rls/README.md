# RLS test plan

Run against a disposable Supabase project with operator and admin JWTs.

Required assertions:
- operator cannot INSERT or UPDATE `shifts` directly;
- operator cannot change `profiles.role`, `is_active`, or `email`;
- operator cannot approve `additional_hours` or `daily_schedules`;
- operator cannot read `audit_log`, `notification_log`, or notification settings;
- admin can review schedules and reports;
- archived employees retain historical shifts but cannot authenticate.

These tests require project credentials and are intentionally not run against production.
