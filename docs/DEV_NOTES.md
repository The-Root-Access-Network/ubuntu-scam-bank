# Development Notes

A running log of decisions, commands, gotchas, and thoughts during
development. Informal — written for the next developer (or future me).

---

## 2026-05-15

### Project initialisation

- Initialised Next.js 16 via `create-next-app` into a temp folder,
  then copied scaffold files manually into the existing repo to avoid
  overwriting README and BRANCHING_STRATEGY.md
- Used `src/` directory structure with App Router
- Tailwind v4 — no tailwind.config.ts, all config lives in globals.css
  via @theme

### Node version

- Wrangler 4.x requires Node >=22. Upgraded from v20.20.0 to v22.22.3
  via nvm: `nvm install 22 && nvm alias default 22`
- Other projects can still use v20 via `nvm use 20` in those directories

### Deployment — switched from Vercel to Cloudflare Workers

- Vercel requires Pro plan for private repos under a GitHub organisation
- Cloudflare Workers free tier supports private org repos with no
  restrictions
- Using @opennextjs/cloudflare adapter (OpenNext) — full Next.js
  feature support including SSR, App Router, Middleware, Route Handlers
- wrangler.jsonc requires `nodejs_compat` flag and compatibility_date
  > =2024-09-23 for process.env to work inside Workers
- `npm run dev` → Next.js dev server (daily development)
- `npm run preview` → OpenNext build + workerd runtime (pre-PR check)
- `npm run deploy` → build and deploy to Cloudflare
- Live URL: **[https://ubuntu-scam-bank.therootaccessnetwork.workers.dev/](https://ubuntu-scam-bank.therootaccessnetwork.workers.dev/)**

### Supabase

- Three-way client split: browser (client.ts), server (server.ts),
  middleware (middleware.ts) — intentional, avoids SSR cookie issues
- DB types generated from live schema via Supabase CLI
- SUPABASE_SERVICE_ROLE_KEY is encrypted in Cloudflare dashboard —
  bypasses RLS, never expose client-side

### API route stubs

- reports/route.ts, submit/route.ts, triage/route.ts created as empty
  stubs initially — caused TypeScript "not a module" error on build
- Fixed by adding placeholder GET/POST exports — will be replaced when
  each endpoint is built out

---

## 2026-05-16

### Homepage — feed and sidebar

- FeedSection and FeedList built with tab filtering (All, Phishing,
  Smishing, Fraud) — filtering is client-side for MVP, server-side
  filtering comes when feed grows
- FeedList tabs use null filter for "All" — pattern is extensible
  for Phase 2 country/category filters
- Sidebar has three cards: leaderboard, shield score (sign-in prompt
  until auth is built), researcher access with API snippet
- Leaderboard avatar colour is deterministic from username charCode —
  no stored preferences needed, consistent across renders
- UK/NG leaderboard tabs are visible but disabled (opacity-60,
  cursor-not-allowed) — Phase 2 when Redis leaderboard is wired up

### TypeScript gotcha — Pick<> in TSX files

- Tables<'reports'> inside Pick<> was missing the opening < after Pick
- Parser read it as JSX and cascaded errors through the rest of the
  file including unrelated TABS constant
- Fix: Pick< (with the angle bracket) — not a Tables vs Database issue
- Reverted Claude's suggested Database bracket notation back to
  Tables<'tablename'> — cleaner and that's what the utility is for

### Typography system

- Added composable @layer utilities type scale to globals.css
- letter-spacing stripped from scale tokens — applied explicitly via
  tracking-display, tracking-heading, tracking-label utilities
- text-body is 16px (readable prose), text-body-sm 14px (UI chrome),
  text-body-xs 13px (secondary text)
- text-label has no uppercase baked in — applied explicitly where needed

### Hero breathing room

- Added vertical padding to Container inside hero section rather than
  min-h — more predictable across content lengths

---

## 2026-05-17

### Auth — Phase 2 Step 1

**Google OAuth setup (Google Cloud Console):**

- Created new GCP project, configured OAuth consent screen (External)
- Created OAuth 2.0 Client ID (Web application type)
- Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- Client ID and Secret saved in Supabase dashboard → Authentication →
  Providers → Google, and in .env.local for reference

**Supabase configuration:**

- Site URL: `https://ubuntu-scam-bank.therootaccessnetwork.workers.dev`
- Redirect URLs: `live URL /auth/callback` + `http://localhost:3000/auth/callback`
  (localhost entry required for Google OAuth to work in local dev)

**Database trigger — auto-create users on first sign-in:**

- Fires after insert on auth.users
- Derives username from email prefix, sanitised + 4-char UUID suffix
  for uniqueness, capped at 24 chars
- Inserts into public.users with badge=watcher, points=0
- on conflict (id) do nothing guards against duplicate trigger fires
- security definer + search_path = public — standard safe pattern

**RLS policies on users table:**

- Two SELECT policies intentionally — Postgres ORs permissive policies,
  so using (true) covers both anonymous (leaderboard) and authenticated reads
- "Users can read own profile" is redundant given the permissive policy —
  dropped it, leaving only "Leaderboard fields are publicly readable"
- UPDATE policy restricts writes to row owner via auth.uid() = id
- Email exposure mitigated at query layer — all public queries explicitly
  select only id, username, points, badge, country_code, never email

**Architecture decision — Nav client island pattern:**

- Nav remains a server component
- NavAuthButton extracted as a dedicated client island
- Only the auth slice re-renders on state change — rest of Nav is static
- Auth state hydrated via getUser() on mount, kept live via
  onAuthStateChange subscription, cleaned up on unmount

**Auth callback route:**

- src/app/auth/callback/route.ts — exchanges OAuth code for session
- On error, redirects home rather than showing an error page — safer
  UX for non-technical users, failure surfaces as "not signed in" state

**country_code and profile editing — deferred:**

- country_code will be populated from first report submission or
  a future profile settings page
- Display name / proper initials deferred to Phase 3 profile feature
- Email initials (first 2 chars) used as interim avatar — acceptable for MVP

**Tested and verified:**

- Google OAuth sign-in with two accounts — both successful
- Email/password sign-up sends confirmation email
- Trigger correctly inserted rows in public.users for all three test accounts
- Nav avatar + sign out renders correctly after sign-in
- Sign out returns nav to sign-in state

### GitHub Release Workflow (CI) Sub-step before Step 2

- Added `.github/workflows/release.yml` — manual trigger via `Actions → Create Release → Run workflow`
- Two inputs: version (e.g. v0.3.0) and title
- Creates annotated tag on main, generates release draft with changelog auto-built from PR titles merged since last tag
- draft: true means auto-generated notes can be reviewed and supplemented with known issues before publishing
- Workflow only active once merged to main — currently in dev, will land in main as part of the v0.3.0 release
- Future release process: feature branches → dev → main → Actions → Run workflow → review draft → publish

### Points logic and AI triage pipeline (Phase 2 Steps 2 & 3)

**calculate.ts:**

- has_metadata contract: contextText.trim().length > 10 — not just
  truthiness. Defined in PointsInput comment so the submit route
  implementation is unambiguous
- Phase 2 bonus constants (streaks, vote confirm, digest) defined
  now with no active code paths — magic numbers live here rather
  than appearing inline when those features are built
- welcomeBonus and spamPenalty are standalone exports — welcome
  bonus is conditional on submission count (checked by submit route),
  penalty is triggered by moderation (not submission logic)
- Unit tests flagged as a future pass — calculatePoints is a pure
  function with no external deps, ideal candidate

**triage.ts:**

- crypto.subtle chosen over node:crypto — Web Crypto API works
  natively in Cloudflare Workers runtime and with nodejs_compat
  in local dev. node:crypto risks runtime mismatch
- getClient() pattern (not module-level instantiation) — avoids
  cold start issues on Workers where top-level side effects can
  cause env var availability problems
- FALLBACK_RESULT frozen with Object.freeze — intent is a fixed
  constant, freeze enforces it
- Markdown fence stripping before JSON.parse — Claude sometimes
  wraps JSON in fences despite prompt instructions

**types/triage.ts:**

- Re-exports from lib/ai/triage.ts — source of truth stays in lib,
  file exists so @/types/triage imports resolve correctly

---

## 2026-05-18

### Deleting a user from SQL Editor

Deleting from `public.users` alone isn't enough — the auth record lives in `auth.users` and that's the source of truth. If you only delete from `public.users`, the auth record remains and the trigger won't re-fire on next sign-in (because the auth user already exists), so the public row won't be recreated cleanly either.

The right way:

```sql
-- Delete from auth.users — cascades to public.users via the foreign key
delete from auth.users where email = 'the-email@example.com';
```

If you don't have the email handy:

```sql
-- Find the user first
select id, email from auth.users;

-- Then delete by id
delete from auth.users where id = 'uuid-here';
```

Alternatively, Supabase dashboard → Authentication → Users → find the user → delete from there. That's the cleanest option for one-off test user cleanup since it handles everything through the UI.

### Badge tier system update (founder review — 2026-05-18)

**Motivation:**
Founder reviewed the original tiers and felt the progression arc was too short. Widened thresholds and added a Sage tier at 20,000+ to reward the most sustained contributors.

**New thresholds:**

- Watcher: 0 – 2,499
- Guardian: 2,500 – 4,999
- Sentinel: 5,000 – 9,999
- Elite Sentinel: 10,000 – 19,999
- Sage: 20,000+

**What changed:**

- `users_badge_check` constraint dropped and recreated with sage added
- `update_badge()` trigger updated with new thresholds
- `BADGE_META` in `utils.ts` updated — sage uses elite colour classes as interim, dedicated tokens in Phase 3 badge UI pass
- Tier thresholds reference comment added to calculate.ts above `POINTS` const — thresholds enforced by DB trigger, comment keeps the file honest

**Note on points progression:**
At `BASE_SUBMISSION = 10pts`, reaching Guardian now requires 250 standard submissions. Longer arc — flagged to founder, intentional.

### Researcher API key flow (founder discussion — 2026-05-18)

**Founder's intent:**
"Request API Key" should be an application process — not instant issuance. Researchers fill a form stating who they are, their role, and intended use. TRAN reviews and approves manually.

**Proposed flow:**

1. Researcher clicks Request API key → /researchers/apply
2. Form fields: full name, organisation, role, use case, portfolio URL (optional), terms agreement
3. Submission creates researcher_applications row (status=pending)
4. TRAN team reviews manually (automated later)
5. On approval, API key generated, hashed, stored in api_keys table
6. Key delivered to researcher via email

**New table needed (Phase 3):**
researcher_applications — id, user_id, full_name, organisation, role, use_case, portfolio_url, status (pending/approved/rejected), reviewed_by, reviewed_at, created_at

**GitHub issue created** — tracked for Phase 3 implementation.
Not a blocker for current development.

**Collaboration / open source plan (founder discussion):**

- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates already in place
- Contribution tiers proposed: Reporter → Contributor → Maintainer → Core team
- `SECURITY.md` needed before going open source — responsible disclosure for vulnerabilities found in the platform itself
- CLA (Contributor License Agreement) worth considering — protects TRAN's ability to relicense. CLA Assistant automates on GitHub
- GitHub issue created for `SECURITY.md` — do before public launch

---

## 2026-05-19

### End-to-end submission pipeline testing and fixes

**Model deprecation fix:**

- claude-sonnet-4-20250514 was returning 404 — deprecated and reaching end-of-life June 15, 2026
- Updated to claude-sonnet-4-6 in [src/lib/ai/triage.ts](../src/lib/ai/triage.ts).
- Lesson: always check Anthropic's model deprecation page before any release that touches the triage pipeline

**Duplicate submission bug:**

- Root cause: route was generating a new `reportId` and skipping the report insert (correct) but still trying to insert a
  submissions row with the non-existent `reportId`
- Fix: `submissionReportId = isDuplicate ? existing?.id : reportId`
- Ledger rows also updated to use `submissionReportId`
- `campaign_id` hardcoded to null — clustering logic is Phase 3

**Storage bucket name mismatch:**

- Bucket created in Supabase dashboard as scam_reports (underscore)
- Code referenced scam-reports (hyphen)
- Fix: corrected BUCKET constant in src/lib/storage/upload.ts
- Also stripped internal error message from user-facing UploadError for STORAGE_ERROR — users see "File upload failed. Please try again."

**Feed not populating — RLS gap:**

- getPageData() uses anon key client which respects RLS
- reports table had RLS enabled but no SELECT policy defined
- Postgres default with RLS enabled + no policy = zero rows returned
- Fix: added "Published reports are publicly readable" policy using (status = 'published') — only published reports visible
- Lesson: always add RLS policies immediately when enabling RLS on a new table, even if the query is public

**Cache revalidation:**

- `router.refresh()` from client wasn't reliably triggering server component re-fetch after submission
- Fix: `revalidatePath('/')` added in submit route before return
- `router.refresh()` with 500ms delay kept as belt-and-suspenders

**`confirm_count` and `view_count`:**

- Both correctly showing 0 — no mechanism writes to them yet
- `confirm_count`: needs community voting (Phase 3)
- `view_count`: needs report detail page — increment on page visit, not on feed impression
- GitHub issues created for both, tracked for Phase 3

**Phase 2 Steps 1–6 verified end-to-end:**

- Auth (Google OAuth + email) ✅
- Points logic ✅
- AI triage pipeline ✅
- File upload to Supabase Storage ✅
- /api/submit full implementation ✅
- SubmissionForm wired to API ✅

---

## 2026-05-23

### User profile — Phase 3 Step 1

**Schema:**

- `display_name` (text, max 50, nullable) and bio (text, max 300, nullable) added to users table via alter table
- No trigger changes — `handle_new_user` leaves both as NULL
- No new RLS policies needed — existing UPDATE policy covers new columns; SELECT using(true) makes them publicly readable

**Architecture decisions:**

- `getInitials()` moved to [utils.ts](../src/lib/utils.ts) — pure function, no client dependencies, so it can be imported by both server components (Sidebar) and client components (ProfileForm, NavAuthButton)
- Initial mistake: exported `getInitials` from `ProfileForm.tsx` ('use client') — server components can't call functions from client files even if the function itself is pure
- Lesson: utility functions with no browser API usage belong in `utils.ts` regardless of where they're first needed

**Profile API route:**

- `PATCH /api/profile` — partial update pattern, only writes fields that were sent, undefined values excluded from payload
- `display_name` and `bio` trimmed at API level via `Zod .transform()`
- country resolved to ISO code via `nameToCode()` before storage

**NavAuthButton:**

- Now fetches display_name from users table after auth
- Supabase query on mount and on auth state change
- Avatar is a Link to /profile (changed from plain anchor)

**Sidebar:**

- display_name shown as primary name, falls back to username
- getInitials() imported from utils.ts

### Report detail page — Phase 3 Step 2

**RLS:**

- indicators table had RLS enabled but no SELECT policy
- Added: "Indicators for published reports are publicly readable" using exists() subquery on reports.status = 'published' — indicators for non-published reports stay hidden

**View count:**

- Incremented via admin client (bypasses RLS) on every page load
- Read-then-write at MVP scale — atomic increment can come later
- Displayed as `view_count + 1` on the page itself so the current visit is reflected immediately without a second fetch

**TypeScript gotcha:**

- Splitting a Supabase `.select()` string across lines with `+` caused type inference to fall back to GenericStringError
- Fix: single unbroken string literal restores full type inference
- Pattern to remember: never concatenate Supabase select strings

**Feed cards:**

- Wrapped in Next.js Link — group/group-hover for summary text colour transition on hover

**Voting placeholder:**

- Comment in report detail page marks where confirm/dispute buttons go in Phase 3 Step 3 — not yet built

---

## 2026-05-25

### Cloudflare env vars — two separate sections (important)

Cloudflare has two distinct places for environment variables:

1. Settings → Build → Build Variables and Secrets
   - Used during npm run build (Next.js build step)
   - Required for `NEXT_PUBLIC_*` variables (inlined at build time)

2. Settings → Variables and Secrets (runtime section)
   - Used when the Worker is handling live requests
   - Required for server-side secrets: `SUPABASE_SERVICE_ROLE_KEY`,
     `ANTHROPIC_API_KEY`, etc.
   - If missing here, `createAdminClient()` throws at runtime even
     if the variable exists in the Build section

Both sections need to have the complete set of variables.
`NEXT_PUBLIC_*` variables should be in both (build + runtime).
Secrets should be in the runtime section at minimum.

---

## 2026-05-27

### Community voting — Phase 3 Step 3

**RLS policies on votes table:**

- INSERT: authenticated users only, own user_id, report must be published — enforced via with check() subquery
- SELECT: public (using true) — needed to check existing votes
- unique (`report_id`, `user_id`) constraint in schema enforces one vote per user at DB level — no application-level check needed
- `sync_vote_counts` trigger already in schema — fires on insert, increments confirm_count or dispute_count on reports automatically

**Vote API route (POST `/api/reports/[id]/vote`):**

- Auth check via `createClient()` first, then `createAdminClient()` for the insert — same pattern as submit route
- try/catch around `createAdminClient()` explicitly — lesson from the Cloudflare env vars production debugging
- Report existence check filters by status = `'published'` — `under_review` reports return 404, not 500
- Own-report guard: 403 if `submitted_by` matches `user.id`
- Duplicate vote returns 409 via unique constraint code '23505'
- Trigger handles count updates — no manual increment in route

**VoteButtons client component:**

- Three distinct render states: signed-out (prompt), own report (read-only counts), voteable (confirm/dispute buttons)
- Optimistic count update on client — DB counts updated by trigger server-side, no refetch needed
- State machine: idle → loading → confirmed/disputed/error
- Buttons disabled after voting — hasVoted guard prevents double-click
- Sign in prompt uses plain text (no link) — nav has visible Sign in button, linking to / was confusing

**Report detail page updates:**

- `submitted_by` added to `getReport()` select string
- Auth check added to page: isOwnReport and isSignedIn derived server-side and passed as props to VoteButtons
- `submitted_by` is `string | null` — `isOwnReport` correctly false when null (anonymous or deleted submitter)
- VoteButtons replaces the placeholder comment from Phase 3 Step 2

**Smoke test results — all passing:**

- Signed-out user: sign-in prompt shown ✅
- Report submitter: read-only counts shown ✅
- Different signed-in user: confirm/dispute buttons shown ✅
- Confirm vote: optimistic count update, DB row confirmed ✅
- Duplicate vote: 409 returned, "already voted" message shown ✅
- Dispute path: working correctly ✅
- under_review report by direct URL: 404 returned ✅

### Leaderboard page and Shield Score card — Phase 3 Step 4

**SQL function `get_monthly_leaderboard()`:**

- security definer + set search_path = public — standard safe pattern
- filter (where pl.delta > 0) excludes spam penalties from monthly sum
- having ... > 0 filters users with zero monthly points
- char(2) for country_code — explicit length required to avoid silent truncation (char without length defaults to char(1))
- grant execute to anon, authenticated — required for Supabase `.rpc()` to call the function from the client

**Leaderboard page (/leaderboard):**

- Tab system uses searchParams — tab=global (default), tab=monthly, tab=NG/GB/GH/ZA/US/KE for country filters
- Global and country tabs query users table directly (points column)
- Monthly tab calls `get_monthly_leaderboard()` via `supabase.rpc()`
- Empty states per tab type: monthly, country-specific, or global
- AVATAR_PALETTE and RANK_COLOR duplicated from Sidebar — acceptable for now, candidate for a shared constants file later

**ShieldScoreCard:**

- Extracted from Sidebar into its own client component (needs useState for AuthModal)
- `TIER_BOUNDS` array mirrors badge thresholds from DB trigger — intentional duplication for frontend progress bar; update both if thresholds change
- `getProgress()` handles Sage (next: null) — shows "Maximum tier"
- Signed-out state shows Sign in button that triggers `AuthModal`
- Authenticated state shows points, badge pill, and progress bar

**Sidebar updates:**

- ShieldScoreCard imported and wired — replaces the static sign-in prompt that was previously hardcoded
- `currentUser` prop added — passed from `page.tsx` server fetch
- "View full leaderboard" changed from `button` to `Link` → `/leaderboard`

**Nav updates:**

- Leaderboard nav link changed from `#leaderboard` anchor to `/leaderboard` page route

**Homepage (`page.tsx`):**

- Auth check added to `getPageData()` for shield score
- profileResult conditional fetch — only queries users table if user is signed in
- currentUser passed to Sidebar as prop

---

## 2026-05-29

### Researcher Approval

How TRAN approves a researcher going forward: open the SQL Editor in the Supabase dashboard, find the application ID from the `researcher_applications` table, then run:

```sql
select approve_researcher_application('the-application-uuid-here');
```

The function returns the raw key in the results panel. Copy it, email it to the researcher. That's the full admin flow for Phase 3.

- TODO: Check is there can be an automated process of sending the key to the researcher as soon as it has been approved by an admin in the SQL Editor in the Supabase dashboard.

---

## 2026-05-30

### Researcher API keys — Phase 3 Step 5

**Schema:**

- `researcher_applications` table — `user_id`, `full_name`, `organisation`, `role`, `use_case`, `portfolio_url`, status (pending/approved/rejected), `reviewed_by`, `reviewed_at`
- RLS: authenticated INSERT (own user_id), SELECT (own rows only)
- index on user_id and status

**approve_researcher_application() function:**

- Originally used pgcrypto (gen_random_bytes + sha256 digest) — both failed on Supabase free tier, extensions not available
- Replaced with: `gen_random_uuid()` x2 for key generation (no extension needed), md5() for hashing (PostgreSQL core built-in)
- Key format: `sv*live* + 64 hex chars` (two UUIDs, dashes stripped)
- `md5()` is acceptable here — this is a lookup hash not a password. If stronger hashing is needed later, upgrade to pgcrypto when available or handle hashing in application code instead
- Returns raw key once — TRAN must copy it and email to researcher
- Updates `researcher_applications.status = 'approved'`
- Sets `users.is_researcher = true`

**API key delivery — currently manual:**

- Admin opens Supabase SQL Editor
- Finds application UUID in researcher_applications table
- Runs: select approve_researcher_application('uuid-here')
- Copies the returned sv*live* key from the results panel
- Emails key manually to researcher at their registered email
- Key is never recoverable from the database after this point

**Automated delivery — tracked as GitHub issue:**

- Target approach: Resend (free tier) + Supabase webhook or Edge Function fires on approval, sends key via email
- Longer term: admin UI at /admin/applications with Approve/Reject buttons, removing SQL Editor dependency entirely

**Researcher API (`/api/v1/reports`):**

- Bearer token auth — key hashed with md5 (matching the approval function) and looked up in api_keys table
- CORS headers: Access-Control-Allow-Origin: \* (public API)
- Query params: type, country, severity, from, to, is_novel, limit (max 200), cursor
- Cursor pagination: base64-encoded published_at timestamp
  TODO: cursor may skip/repeat entries if two reports share identical published_at — acceptable at MVP scale
- Indicators batch-fetched per page and embedded in response
- `last_used_at` update is fire-and-forget — may not persist on Workers if the instance exits before the Promise resolves
- Rate limiting: `rate_limit_rpm` stored and returned in X-RateLimit-Limit header but not enforced yet
  TODO: enforce via Cloudflare rate limiting rules or Redis

**Hashing consistency:**

- PostgreSQL function: `md5(v_raw_key)`
- API route: blueimp-md5 npm package (md5(rawKey))
- Web Crypto API does not support MD5 natively — hence the npm dependency. If moving to SHA-256 later, update both the function and the API route together

**Apply page:**

- Unauthenticated users see marketing content + sign-in notice instead of a hard redirect to `/` — nav Sign in button is visible
- Pending/approved: form hidden, status banner shown
- Rejected: contact email shown for appeals
- Guard: .in('status', ['pending', 'approved']) — rejected users can reapply

---

## 2026-06-10

### Email exposure fix — fix/email-exposure

**Problem:**
The `users` table was directly accessible to the `anon` role via Supabase's auto-generated REST API. Anyone with the public anon key (visible in the browser network tab) could run:

```sh
GET /rest/v1/users?select=\*
```

...and retrieve all columns including email addresses. The existing RLS policy "Leaderboard fields are publicly readable" using(true) was not sufficient protection because it only governs row visibility, not column visibility.

**Fix:**

- Created `public.leaderboard_users` view exposing only safe columns: id, username, display_name, points, badge, country_code
- View created with `security_invoker = false` (security definer behaviour) so it runs as the owner regardless of calling role
- Granted SELECT on the view to anon and authenticated
- Revoked direct SELECT on `public.users` from anon
- RLS was already enabled on users (confirmed via pg_class query) so Step 4b was not needed
- View owner set to postgres for clean permission chain

**Verification:**

- `GET /rest/v1/users?select=*` with anon key → permission denied ✅
- `GET /rest/v1/leaderboard_users?select=*` with anon key → safe columns only ✅

**Application code changes:**

- `src/types/database.ts` — regenerated via Supabase CLI to include leaderboard_users view type (all columns nullable — known limitation of Supabase's type generator for views)
- `src/app/(public)/leaderboard/page.tsx` — updated getData() query from `from('users')` to `from('leaderboard_users')`
- `src/app/(public)/page.tsx` — updated two queries: leaderboard top-5 and contributor count stat both changed to `from('leaderboard_users')`. Contributor count was showing 0 for unauthenticated visitors because anon could no longer read the users table directly.
- `src/components/layout/Sidebar.tsx` — LeaderboardUser type changed from `Pick<Tables<'users'>, ...>` to `Tables<'leaderboard_users'>`. Null guards added at three points of use (username, points, badge) because the type generator marks all view columns as nullable.

**Note on supabase/.temp/cli-latest:**
Modified as a side effect of running `supabase gen types` — not a meaningful change, included in commit for cleanliness.

**Closes:** [Issue #9](https://github.com/The-Root-Access-Network/ubuntu-scam-bank/issues/9)

## 2026-06-10 (continued)

### Feedback form, contact page, and site-wide footer — feature/feedback-form

- Created `feedback` table in Supabase with RLS enabled and no anon/authenticated policies — all writes go through the admin client (service role). Added check constraint on `role` column to stay in sync with Zod enum in the API route. Index on `created_at desc` for dashboard queries.

- `POST /api/feedback` — Zod validation, admin client insert, optional Resend notification gated on `RESEND_API_KEY`. If key is absent, insert still completes and no error surfaces to the user. Resend `from` domain will need updating to verified subdomain once `scambank.ubuntubridgeinitiatives.org` (or equivalent) is confirmed. Recipient address to update from placeholder to `therootaccessnetwork@africybercore.com` before Resend goes live.

- Footer replaced the thin strip with a four-column layout: brand + mission line, Platform links, Researchers links, Organisation links (including external links to UBI and TRAN sites). Bottom bar has copyright and tagline. Footer applied to all public pages in a separate commit.

- Nav "For researchers" link updated from `#researchers` anchor to `/researchers/apply`. No auth-conditional logic needed — the apply page already handles unauthenticated visitors gracefully.

- Tested locally: form submits, success state renders, row written to Supabase correctly. Resend skipped silently as expected (no API key set). Email delivery will be verified once domain is verified and key is added to Cloudflare runtime secrets.

### Hero copy update and post-merge fixes — chore/hero-copy

- Added bold incentive copy to homepage hero between the h1 and the existing description paragraph: "Report scams. Earn points. Top contributors get rewarded." with a non-binding follow-up line about contributor rewards coming soon. Copy intentionally avoids hard promises on timeline or reward type.
- Added `minLength={2}` to Full name input in FeedbackForm for client-side parity with the Zod schema minimum.
- Added Footer to the unauthenticated render path of `/researchers/apply` — was missing from that branch.
- Simplified organisation field validation in `/api/feedback route` — replaced `.optional().or(z.literal(''))` with `.optional().transform()` pattern. Cleaner handling of empty string from HTML form inputs. The || null conversion at the insert site is unaffected.
