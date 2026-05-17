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
