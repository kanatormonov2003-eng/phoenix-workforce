# Edge Function test plan

Use Deno tests against local Supabase:

- unauthenticated requests return 401;
- operator requests return 403;
- admin Telegram test ignores client `chat_id` and text;
- malformed employee IDs return 422;
- delete archives instead of deleting history;
- Telegram timeout returns 504 and does not expose upstream details.
