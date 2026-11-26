# Performance: Vercel + Supabase

The application keeps its existing custom authentication, UI and private `biscord` data schema. Existing users, sessions, password hashes and MFA encryption keys remain compatible. This change does not migrate accounts to Supabase Auth.

## Runtime

- Vercel Functions and Supabase run in São Paulo (`gru1` / `sa-east-1`). Use the Supabase transaction pooler on port 6543, verified TLS and a dedicated database role.
- `BISCORD_DB_POOL_MAX=2` limits each warm function instance; idle connections expire after 30 seconds. This is not a global connection cap. Monitor Supavisor usage before increasing it.
- `GET /api/bootstrap` combines session and workspace metadata. Message attachments and shared channel histories are loaded progressively through authorized history routes.
- History uses `(created, id)` keyset pagination, a maximum of 100 rows and approximately 2 MiB of message data per page. Search and pinned-message queries omit attachment bodies.
- Messages use client-generated UUIDs for retry idempotency. Message writes and recipient outbox events commit atomically. Per-recipient advisory locks preserve replay ordering across concurrent transactions.
- The browser maintains one Supabase connection/channel per session for messages and call signaling. Private session Broadcast topics receive committed events. Large events use an authorized event-item fetch. Replay recovers missed events without one-second polling.
- Short-lived server-issued JWTs contain the existing user/session identifiers and the restricted `biscord_realtime` role. Active session checks bind the JWT subject and topic. Clients have no Broadcast INSERT grant; revoked sessions are excluded when publishing.
- Message events patch keyed message elements. They do not reload the workspace, discard drafts or reconstruct the composer. Historical pagination preserves scroll position; image resize handling keeps the current reading position or follows the bottom.

## Database patches

Apply these SQL files to the private application database as an administrator, in order:

1. `supabase/performance-realtime.sql`
2. `supabase/performance-broadcast.sql`
3. `supabase/performance-indexes.sql`

These are upgrades for the existing schema, not a blank-project schema installer. They were applied to the new São Paulo database during this migration. Keep RLS and the session validation function enabled. Do not grant browser roles access to private users, sessions, messages or encryption material.

Configure the variables documented in `.env.example`. `SUPABASE_ANON_KEY` accepts the public publishable key despite its legacy name. `SUPABASE_JWT_SECRET`, `DATABASE_URL` and `BISCORD_ENCRYPTION_KEY` are server-only. Preserve the encryption key when migrating existing MFA data. The SDK is lazy-loaded and does not persist a separate Supabase Auth session.

## Verification

Run `node --test *.test.mjs`, `node build-client.mjs` and `node vercel-prepare.mjs`. The 43-test suite covers existing behavior, tied-timestamp pagination, authorization, concurrent retries, bounded attachment pages, cache reconciliation, deletion tombstones and realtime lifecycle races.

`performance-live.mjs --extended` runs real HTTP/WebSocket checks with two disposable accounts. It verifies delivery, duplicate retries, cursor pagination, large attachments, private topics, client forgery rejection and session revocation. It requires a private ignored `.env.performance-access.local` containing `base` and, for protected deployments, `shareUrl`. Public production can use `PERF_BASE`. `PERF_OUT` selects the JSON report path. The script normally removes its accounts; `--keep-fixtures` retains them for browser checks and `--cleanup` removes retained fixtures. Never commit private fixture/access files.

`Server-Timing` reports aggregate database time/query counts and per-instance pool occupancy/waiting. It contains no SQL, credentials or message contents. Compare client request counters (`documentElement.dataset`) and workspace render counters (`#workspace.dataset`) before/after an event to distinguish message patches from full renders.

Latency measurements cover network + API and actual WebSocket delivery from the test PC, excluding browser rendering and first download of static assets. Five samples per operation are descriptive, not a load-test SLA. The old history endpoint returned the full workspace; the new endpoint returns one bounded page, so history timings represent the changed user operation and differ in payload size. Raw HTTP totals from extended checks are not directly comparable with a shorter baseline run.

## Remaining opportunities

Move inline base64 attachment/avatar data to Supabase Storage with private attachment authorization; virtualize very long open conversations; separate infrequent workspace metadata refreshes by resource. These require additional product/data work. Measure real concurrent user traffic and free-tier quotas before changing pool limits or purchasing resources.
