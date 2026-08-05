# Security model

## Roles

`admin` manages operators, schedules, reports, and notification settings. `operator` can read their own profile, schedule, history, and use the controlled start/end shift RPCs.

## Authentication

Supabase Auth issues sessions. The browser receives only the public anon key. Service-role credentials and Telegram secrets belong only in Edge Function secrets. Admin functions verify the bearer token and profile role server-side.

## RLS

RLS is enabled on application tables. Operators have self-read access where needed, but cannot directly write shift state, approve hours, change roles, write audit records, or read operational logs. Admin writes are explicit and role-checked.

## Sensitive operations

Shift lifecycle is enforced by `start_shift()` and `end_shift()` with row locking and a unique open-shift index. Administrative reporting and blocking functions call `admin_guard()` inside the database, so frontend route protection is not a security boundary.

## Telegram

The browser cannot choose a chat ID or arbitrary message. The test function reads the configured chat ID server-side and sends a fixed message. Bot tokens are never committed or exposed to the client.

## Data retention

Operator deletion is archival. Historical shifts remain available for reporting and audit. Auth access is banned rather than deleting the identity and cascading historical data.
