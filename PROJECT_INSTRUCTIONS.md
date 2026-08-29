# Project: UbuntuScamBank

## The Root Access Network (TRAN) — Ubuntu Bridge Initiative

---

## What This Project Is

UbuntuScamBank is a crowdsourced threat intelligence platform built under TRAN's Ubuntu Bridge Initiative. Everyday people submit scams they've received, earn points for contributing, and help protect others. Security researchers get a clean, open feed of real-world threat data via a structured API.

The platform is designed for **non-technical users first** — the majority of submitters are ordinary people who encountered a scam on their phone or email. Everything — copy, UX, flows — should reflect that. Jargon belongs in the researcher API, not the submission form.

**Current state:** Stable. Phases 1–4 core features shipped (docs reference v0.9.4). Live at:
[https://scambank.ubuntubridgeinitiatives.org/](https://scambank.ubuntubridgeinitiatives.org/)

> **Deployment note:** Vercel is the canonical primary deployment (canonical production URL above). A legacy Cloudflare Workers deployment (`ubuntu-scam-bank.therootaccessnetwork.workers.dev`) still runs in parallel while Vercel is canonical; decommission is not yet scheduled. Treat Vercel as the source of truth; Cloudflare/OpenNext config is legacy.

---

## Tech Stack

| Layer                     | Technology                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Frontend                  | Next.js 16 (App Router) + TypeScript (strict)                                         |
| Styling                   | Tailwind CSS v4 — @theme in globals.css, no tailwind.config.ts                        |
| Backend                   | Next.js API Routes (same repo)                                                        |
| Database + Auth + Storage | Supabase (PostgreSQL + Auth + Storage)                                                |
| AI Triage                 | Claude API — `claude-sonnet-4-6` (text + image vision)                                |
| Email                     | Resend — transactional + Broadcasts + Audience                                        |
| Deployment                | Vercel (primary) + Cloudflare Workers via `@opennextjs/cloudflare` (legacy, parallel) |
| Icons                     | @tabler/icons-react                                                                   |
| Validation                | Zod                                                                                   |
| Utilities                 | clsx, tailwind-merge, blueimp-md5                                                     |
| Country data              | Pre-generated static JSON (scripts/generate-countries.mjs)                            |

**Removed from original plan:**

- Upstash Redis — leaderboard uses Postgres function instead
- Cloudflare R2 — using Supabase Storage instead
- Meilisearch/Algolia — deferred, not yet needed at current scale

> Note: the original plan line "Vercel — switched to Cloudflare Workers (private org repo paywall)" is now reversed. The repo was made public (under Somto's account managing ubuntubridgeinitiatives.org), enabling Vercel free tier, and the project migrated back to Vercel as primary.

---

## Repository & Branching

- GitHub Organisation: The-Root-Access-Network
- Repo: `ubuntu-scam-bank` (**public**, MIT licence)
- Live URL: `https://scambank.ubuntubridgeinitiatives.org/` (Vercel)
- Branch strategy: `main` (production) ← `dev` (integration) ← `feature/*`
- Developers always branch off `dev`. PRs target `dev`. Only maintainers handle `dev → main` (releases).
- Direct pushes to `main` or `dev` are not permitted.
- Releases tagged via GitHub Actions workflow (manual trigger, draft mode)
- Current release: v0.9.4
- Commit convention: conventional commits, scoped (`feat(ops):`, `fix(reports):`, `chore:`, `docs:`), one logical change per commit. Multi-file changes broken into commits by concern.

---

## Supabase Clients — Critical Pattern

Three clients, three trust levels. Never mix them up:

```typescript
// Browser — anon key, for client components
import { createClient } from '@/lib/supabase/client';

// Server — anon key, cookie-aware, respects RLS
import { createClient } from '@/lib/supabase/server';

// Server — service role key, bypasses RLS, for trusted writes
import { createAdminClient } from '@/lib/supabase/server';
```

Always wrap `createAdminClient()` in try/catch—it throws if `SUPABASE_SERVICE_ROLE_KEY` is not set. This caused a production incident (see DEV_NOTES.md). `createAdminClient()` is synchronous; `createClient()` is async (await it).

**RLS / public surface — non-negotiable:**

- The anon/session client (`createClient()`) must only query the safe views from anon-reachable code:
  - `leaderboard_users` — never `users` directly (emails were exposed via anon REST before; fixed in `fix/email-exposure`)
  - `public_reports` — never `reports` directly (`raw_content` is excluded from the view by design — may contain victim PII)
- `createAdminClient()` (service role) bypasses RLS entirely — used exclusively in trusted server code (ops routes, submit route, triage).
- **View columns are all nullable** in generated TypeScript types regardless of underlying constraints — use `??` fallbacks at every usage site; don't fight the type generator.

**Ops security — 5-layer model:** middleware redirect → layout moderator check → page moderator check → API route guard (`src/lib/ops/requireModerator.ts`) → no client-exposed admin state. Every new ops page or API route must independently re-verify `is_moderator`; never trust an outer layer alone.

**Env vars — Vercel (primary):** non-public secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`) set in the Vercel dashboard → Settings → Environment Variables (Production). `NEXT_PUBLIC_*` vars are inlined at build.

**Env vars — Cloudflare (legacy):** when touching the CF deployment, secrets must be set in BOTH Settings → Build → Build Variables and Secrets AND Settings → Variables and Secrets. Missing from the second = silent 500s in production.

---

## Database

Full schema in `DATABASE_SCHEMA.md`. Tables: `users`, `campaigns`, `reports`, `indicators`, `submissions`, `votes`, `points_ledger`, `api_keys`, `researcher_applications`, `feedback`.

Public read surface (views):

- `leaderboard_users` — safe subset of users (no email, bio, roles), anon SELECT granted
- `public_reports` — safe subset of reports (no `raw_content`), anon SELECT granted

Key behaviours:

- Badge tier auto-updated via Postgres trigger on `users.points`
- Vote counts sync via trigger on `votes` inserts
- `content_hash` on `reports` handles deduplication
- `display_name` and `bio` columns on `users` (added Phase 3)
- Monthly leaderboard via `get_monthly_leaderboard(target_month)` Postgres function
- API key approval/rejection via `approve_researcher_application()` / `reject_researcher_application()` functions
- `md5()` used for API key hashing — `pgcrypto` is not available on free tier; `blueimp-md5` (client) must stay in sync with Postgres `md5()` exactly
- Storage bucket: `scam_reports` (**underscore**, not hyphen — a real bug was caught here)

---

## AI Triage Pipeline

Every submission passes through Claude before storage:

1. PII scrub — victim data stripped, attacker indicators kept
2. Classification — type, severity (1–5), confidence, plain-English summary
3. IOC extraction — domains, IPs, emails, phones, URLs, sender names
4. Novelty detection — flags new campaign patterns
5. Deduplication — SHA-256 hash of coreContent (excluding context note)

Two entry points in `src/lib/ai/triage.ts`:

- `triageSubmission(rawContent)` — text-only
- `triageSubmissionWithImage(rawContent, imageBase64, mimeType)` — vision, JPEG/PNG/WebP only

Both share a `parseAndValidate()` helper and `TRIAGE_SYSTEM_PROMPT` (`prompts.ts`). **Triage never throws** — it returns `triage_failed: true` on any failure. Reports are always stored; failed triage → `status = 'under_review'`.

Model: `claude-sonnet-4-6`. Full pipeline in `AI_TRIAGE.md`.

---

## Points & Badge System

| Badge          | Threshold     | Unlocks                      |
| -------------- | ------------- | ---------------------------- |
| Watcher        | 0–2,499       | Submit, browse feed          |
| Guardian       | 2,500–4,999   | Community voting             |
| Sentinel       | 5,000–9,999   | Campaign tagging             |
| Elite Sentinel | 10,000–19,999 | Moderator queue, STIX export |
| Sage           | 20,000+       | Strategic advisor role       |

Points: base submission (+10), high severity (+10), novel campaign (+25), full metadata (+5), duplicate confirmation (+5), welcome bonus (+50 once), **VOTE_CONFIRM (+15, every 3rd confirm vote — now active)**.

Still inactive (constants defined, no code paths): `STREAK_7_DAY`, `STREAK_30_DAY`, `FEATURED_DIGEST`.

Always reference the single `POINTS` object in `src/lib/points/calculate.ts` — never hardcode point values inline.

---

## What's Built (Phases 1–4 shipped)

**Submission pipeline:**

- `SubmissionForm.tsx` — full wired form with file upload, drag-and-drop, AI classification display, real points breakdown on success
- `/api/submit` — 16-step pipeline: auth, parse, upload, hash, triage, points, write to reports/indicators/submissions/points_ledger/users
- File-only submissions supported (text or file), EXIF stripped on upload, image triage for JPEG/PNG/WebP

**Feed & discovery:**

- Public feed with tab filtering (All/Phishing/Smishing/Fraud), homepage 6-item preview
- Paginated `/reports` with type/country filters
- `/reports/[id]` — detail page with IOCs, tags, voting, view count, original-submission toggle (submitter/moderator only)

**Auth:**

- Google OAuth + email/password via Supabase Auth
- `handle_new_user()` trigger creates a `public.users` row on first sign-in
- `NavAuthButton` — client island, owns auth state in server-rendered nav
- Resend Audience sync on registration (`addToDigestAudience`)

**Profile:**

- `/profile` — editable display name, bio, country
- `PATCH /api/profile` — partial update, Zod validation

**Leaderboard:**

- `/leaderboard` — global, monthly (month picker, history from 2026-05), dynamic country tabs
- `ShieldScoreCard` on homepage sidebar with progress bar to next tier

**Community voting:**

- Confirm/Dispute buttons on report detail pages
- `POST /api/reports/[id]/vote` — one vote per user, duplicate = 409
- VOTE_CONFIRM bonus active: every 3rd confirm awards +15 to the original submitter

**Researcher API:**

- `/researchers/apply` — application form with status tracking
- `GET /api/v1/reports` and `GET /api/v1/reports/[id]` — Bearer token auth, filters, cursor pagination, indicators embedded, CORS enabled

**Ops admin console (`/ops`):**

- Overview — stat cards
- Users — search, temp/permanent ban, delete, unban (inline confirm modals, guarded against moderators/self)
- Applications — approve/reject with copy-once API key modal + Resend key delivery
- Reports — moderation queue (publish/reject)
- Digest — stats + top reports for manual Resend Broadcast
- 5-layer security model (middleware → layout → page → `requireModerator` → no client admin state)

**Legal & misc:**

- `/privacy` and `/terms` pages, footer fully wired
- Custom SVG favicon, FAQ accordion, mobile-responsive submission form (3-breakpoint standard)
- Email infrastructure: transactional emails (ban/unban/delete/approve/reject), one digest broadcast sent end-to-end

---

## What's Not Built Yet / Inactive

- Rate limiting enforcement on `/api/v1/reports` (headers returned, not enforced)
- Campaign clustering (`campaign_id` always null currently)
- Streak bonuses (`STREAK_7_DAY`/`STREAK_30_DAY` constants defined, no code paths)
- Email digest automation (manual Broadcast workflow via `/ops/digest`; Vercel Cron deferred)
- STIX 2.1 export
- Digest personalization fix (FIRST_NAME/DISPLAY_NAME merge tags fall back to "Hi there" — a contact-property data gap, not a code bug)
- Cloudflare Workers decommission (no committed date)
- Open-source polish (SECURITY.md / CONTRIBUTING.md — repo is already public)

---

## Design Principles (Non-Negotiable)

- **Plain language.** "What scam did you receive?" not "Submit an IOC"
- **Mobile-first.** Design for at minimum 3 breakpoints (mobile/tablet/desktop); never just desktop
- **Instant gratification.** Points shown within 3 seconds of submitting
- **Privacy first.** Victim PII never stored. JPEG EXIF stripped on upload.
- **Composable design tokens.** Never bake uppercase or tracking into typography scale tokens—apply explicitly at point of use
- **Server/client boundary respect.** Pure utilities in utils.ts, not in 'use client' files—the getInitials() incident is the reference case

---

## Runtime Constraints

- **Vercel (primary):** standard Node.js runtime. Secrets in Vercel dashboard (Production environment).
- **Cloudflare Workers (legacy, still live):** no native Node.js modules—use Web Crypto API (`crypto.subtle`) not `node:crypto`; CPU time limits (country list pre-generated as static JSON, never computed at runtime); `blueimp-md5` (Web Crypto has no MD5); secrets in BOTH dashboard sections.

Since the CF deployment still runs in parallel, keep cross-runtime-safe choices (Web Crypto, no native modules) where practical.

---

## How to Work in This Project

- Follow Next.js App Router conventions and TypeScript strict mode. Note: this is Next.js 16 — APIs/conventions may differ from older training data; consult `node_modules/next/dist/docs/` when unsure.
- Always check which Supabase client is appropriate before writing DB code.
- Wrap `createAdminClient()` in try/catch—it throws if env var missing.
- Anon-reachable queries go through `leaderboard_users` and `public_reports` views only.
- Every ops page and API route independently re-verifies `is_moderator` (5-layer model).
- Never hardcode point values—use the `POINTS` object in `calculate.ts`.
- Supabase `.select()` strings must be single unbroken literals (no concatenation) — concatenation breaks type inference (`GenericStringError`).
- Auth checks and `cookies()` calls go inside async page/route functions, never at module level.
- Storage bucket is `scam_reports` (underscore).
- All user-facing copy readable by a non-technical person.
- Flag decisions needing founder (Quadri Omoloju) input; technical decisions can proceed independently.
- Prioritise free/affordable tiers—this is an NGO.
- Reference `DATABASE_SCHEMA.md` before any schema work; `AI_TRIAGE.md` before triage work; `FEATURE_SPECS.md` for implementation status.
- Docs may lag behind the latest shipped branches — verify against actual code before trusting them fully.
- Update `DEV_NOTES.md` at the end of every meaningful session.

**Working preferences:**

- Complete, production-grade code delivered inline in chat (not downloadable files) unless explicitly asked otherwise.
- Any code block pasted into a prompt is a draft, not a spec — apply genuine technical judgment and flag better approaches rather than transcribing verbatim.
- Prefer honest "I don't know, let's verify" over confident guessing.
- Provide a concrete verification checklist ("what to check") after non-trivial changes.
- Conventional commits, scoped, one logical change per commit.
