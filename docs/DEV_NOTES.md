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
