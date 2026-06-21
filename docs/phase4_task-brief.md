# Phase 4 Task Brief

Branch: `feature/admin-panel`

Branch off: `dev`
Build a protected admin panel at `/ops`. This is Phase 4's primary admin feature covering user management and researcher application approval.

Security model — implement all layers, no exceptions
The path `/ops` was chosen deliberately over `/admin` to avoid the most commonly probed admin route. Security does not rely on obscurity alone — five independent layers must all be present:

- Middleware: any unauthenticated request to `/ops` or `/api/ops` is redirected to `/` before any server component runs
- Layout-level server check: `src/app/ops/layout.tsx` independently verifies `is_moderator = true` for the session user via the server Supabase client — redirects to `/` if not authorised
- Page-level server check: every page under `/ops` independently verifies moderator status in its own data fetch — never trusts the layout check alone
- API route guards: every route under `/api/ops/` independently verifies session AND `is_moderator = true` using the server Supabase client before executing any action
- No client-side admin state: `is_moderator` is never included in any client-facing API response or exposed in page props accessible to non-admin users

Never use client-side auth checks as the primary guard for admin access.

## Part 1 — Middleware update

Update `middleware.ts` to add `/ops` to the list of protected paths. Unauthenticated requests to any `/ops` route redirect to `/`. Do the same for `/api/ops`.

## Part 2 — Layout and navigation

Create `src/app/ops/layout.tsx` — server component. Fetches the current session, queries `public.users` for `is_moderator`, redirects to `/` if either check fails. Renders a minimal sidebar with links to:

- `/ops` — Overview
- `/ops/users` — Users
- `/ops/applications` — Researcher Applications

No public Nav component inside ops — use a stripped-down internal layout consistent with the existing design tokens but clearly distinct from the public-facing UI.

## Part 3 — `/ops` overview page

Server-rendered dashboard with four stat cards fetched in parallel:

- Total registered users (from `public.users` count)
- Pending researcher applications (from `researcher_applications` where `status = 'pending'`)
- Published reports count (from `reports` where `status = 'published'`)
- Reports pending moderation (from `reports` where `status = 'pending'`)

All fetched via admin client. No client-side fetching.

## Part 4 — `/ops/users` page

Server-rendered table of all users from `public.users`. Use the admin client — this bypasses RLS and returns all rows including moderators.

Columns: username, display name, badge, country, points, joined date, ban status.

To get ban status, fetch from `auth.users` via the admin Supabase client:

```typescript
const { data: authUsers } = await admin.auth.admin.listUsers();
```

Match on `id` to get `banned_until` for each user. A user is banned if `banned_until` is set and is a future timestamp.

Client-side search by username or display name — filter on the fetched list, no additional DB query needed at current user counts.

Each row has three action buttons rendered as a client component (`UserActions`):

Temporary ban — opens a small inline picker with duration options (1 day, 7 days, 30 days, 90 days). On confirm, calls POST `/api/ops/users/[id]/ban` with `{ duration: '168h' }` (example for 7 days). Route sets `banned_until` via `supabase.auth.admin.updateUserById(id, { ban_duration: '168h' })`. Sends Resend email to user.

Permanent ban — on confirm (with confirmation prompt: "This will permanently block this user from signing in. Are you sure?"), calls POST `/api/ops/users/[id]/ban` with `{ duration: '876000h' }`. Sends Resend email to user.

Delete account — on confirm (with strong confirmation prompt: "This will permanently delete this account. Their contributions will remain anonymised. This cannot be undone."), calls POST `/api/ops/users/[id]/delete`. Route calls `supabase.auth.admin.deleteUser(id)` — this cascades to `public.users` via the existing foreign key. Their reports, votes, and submissions remain with `submitted_by`/`user_id` set to null (ON DELETE SET NULL is already in the schema).
Sends Resend email to user's email address (must be captured before deletion).

Unban — shown instead of ban buttons when user is currently banned. Calls POST `/api/ops/users/[id]/unban`. Route calls `supabase.auth.admin.updateUserById(id, { ban_duration: 'none' })`. Sends Resend email to user confirming their access is restored.

All four action buttons are disabled for any user where `is_moderator = true` — moderators cannot action other moderators.

## Part 5 — `/ops/applications` page

Three tabs: Pending (default), Approved, Rejected.
Each tab fetches `researcher_applications` filtered by status, joined with display name and email from `public.users` via the admin client.

Each application row shows: full name, organisation, role, use case, portfolio URL (external link), submitted date, associated account email.

Approve button (Pending tab only):

- Calls POST `/api/ops/applications/[id]/approve`
- Route calls `supabase.rpc('approve_researcher_application', { p_application_id: id })`
- Function returns the raw API key
- Route also fires Resend email to researcher's registered email with the key
- Route returns `{ success: true, apiKey: '...' }` to client
- Client displays key in a modal: "API key generated. Copy it now — it cannot be recovered." with a one-click copy button and a close button. Closing the modal without copying shows a warning: "Have you copied your key? It will not be shown again."

Reject button (Pending tab only):

- Calls POST `/api/ops/applications/[id]/reject`
- Route calls `supabase.rpc('reject_researcher_application', { p_application_id: id })`
- Route fires Resend rejection email to researcher
- Returns `{ success: true }`

## API routes — full list

All routes must verify session and `is_moderator = true` before any action. Use admin client for all DB operations.

- `POST /api/ops/users/[id]/ban` — body: `{ duration: string }`. Calls `supabase.auth.admin.updateUserById`. Sends ban email.
- `POST /api/ops/users/[id]/unban` — Calls `supabase.auth.admin.updateUserById(id, { ban_duration: 'none' })`. Sends unban email.
- `POST /api/ops/users/[id]/delete` — Captures email first, then calls `supabase.auth.admin.deleteUser(id)`. Sends deletion email.
- `POST /api/ops/applications/[id]/approve` — Calls RPC, sends API key email, returns key to client.
- `POST /api/ops/applications/[id]/reject` — Calls RPC, sends rejection email.

## Resend email templates — plain text

All emails sent from `noreply@scambank.ubuntubridgeinitiatives.org` to `therootaccessnetwork@africybercore.com` as CC (so TRAN has a record of every action taken). Main recipient is the affected user.

Create `src/lib/email/templates.ts` with plain-text template functions:

```typescript
export function temporaryBanEmail(username: string, until: string): string
export function permanentBanEmail(username: string): string
export function accountDeletedEmail(username: string): string
export function unbanEmail(username: string): string
export function researcherApprovedEmail(name: string, apiKey: string): string
export function researcherRejectedEmail(name: string): string
```

Each returns a plain text string. Keep copy professional but human — this is a community platform, not a corporation. Example for temporary ban:

```markdown
Hi [username],

Your UbuntuScamBank account has been temporarily suspended due to
suspicious activity. Your access will be restored on [date].

If you believe this is an error, please contact us at
info@therootaccessnetwork.com.

— The Root Access Network team
```

Create a shared `src/lib/email/send.ts` utility that wraps the Resend fetch call (same pattern as the feedback route) gated on `RESEND_API_KEY`. All email sends in the ops routes go through this utility, not inline fetch calls.

Commit structure

```bash
feat(ops): admin panel layout, middleware guard, and overview page
feat(ops): user management with ban, unban, and delete actions
feat(ops): researcher application approval and rejection UI
feat(email): shared Resend email utility and templates
```
