# AGENTS.md — UbuntuScamBank (scambank.ubuntubridgeinitiatives.org)

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 (design tokens in `globals.css`, no tailwind.config.ts)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Auth:** Supabase Auth (Google OAuth + email/password)
- **AI:** Claude API (`claude-sonnet-4-6`) for scam triage (text + image via Claude vision)
- **Email:** Resend (transactional + digest)
- **Icons:** Tabler Icons (`@tabler/icons-react`)
- **Validation:** Zod
- **Deployment:** Vercel (primary), Cloudflare Workers (legacy)
- **Schema:** No tracked migrations — applied via Supabase SQL Editor/CLI; schema documented in `docs/DATABASE_SCHEMA.md` (types regenerated via `npx supabase gen types typescript`)

## Commands

| Command                      | What it does            |
| ---------------------------- | ----------------------- |
| `npm run dev`                | Start dev server        |
| `npm run build`              | Production build        |
| `npm run build:cf`           | Build for Cloudflare    |
| `npm start`                  | Start production server |
| `npm run preview`            | Preview build           |
| `npm run lint`               | Run ESLint              |
| `npm run deploy`             | Deploy                  |
| `npm run generate:countries` | Generate country data   |

## Architecture

- Crowdsourced threat intelligence platform by The Root Access Network (TRAN) / Ubuntu Bridge Initiative (UBI)
- Users report scams (SMS, email, WhatsApp, phone), earn points with badge tiers (Watcher → Guardian → Sentinel → Elite Sentinel → Sage)
- AI-powered scam triage via Claude API
- Leaderboards, ops admin panel, researcher API with API key management
- i18n country codes, Gravatar-style avatars (`blueimp-md5`)

## Key Env Vars

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`

## Knowledge Files

- `PROJECT_INSTRUCTIONS.md` — full project brief (loaded below via `@`)
- `docs/DATABASE_SCHEMA.md` — schema, RLS, views, functions
- `docs/AI_TRIAGE.md` — triage pipeline
- `docs/FEATURE_SPECS.md` — feature specs / implementation status
- `docs/DEV_NOTES.md` — running dev log (update at end of every session)
- `ubuntu-scam-bank_project-context-v2.md` — session-continuity context (gitignored)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

@PROJECT_INSTRUCTIONS.md
@../.config/opencode/rules.md
