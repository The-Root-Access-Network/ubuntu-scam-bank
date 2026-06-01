# UbuntuScamBank — Feature Specs & UX Reference

> **Living document** — this reflects the current best understanding of the project as of the initial brainstorming phase. Decisions, structures, and specs here are subject to change as development progresses. Update this file when anything meaningfully changes.
>
> ---

---

## Submission Flow

✅ **Implemented as a single-page form** at `src/components/forms/SubmissionForm.tsx`

The actual implementation is a single card with:

- Upload zone (drag and drop, file picker, or paste text)
- Paste text area
- Scam type chip selector
- Severity dot selector (1–5)
- Country dropdown (full world list, locale-detected default)
- Optional context textarea
- Submit button with loading state
- Points breakdown on success

Note: The 4-screen mobile wizard described in the original brainstorm was not implemented. The single-form approach was chosen for simplicity.

The multi-step flow remains a consideration for a future mobile app.

---

## Public Feed

✅ **Fully implemented.** Available at `https://ubuntu-scam-bank.therootaccessnetwork.workers.dev/`

- Browsable without login
- Each card shows: scam type, severity badge, country flag, summary, IOC count, confirm/dispute count
- Filters: type, country, date range, severity
- Search across summaries and IOCs
- No raw content shown publicly — summary + indicators only
- Tabbed interface: Recent, Trending, By type, By country

---

## Researcher API

Base URL: `https://ubuntu-scam-bank.therootaccessnetwork.workers.dev/api/v1`

Authentication: Bearer token in Authorization header
`Authorization: Bearer sv_live_...`

Rate limit: 60 requests/minute per key (stored in api_keys.rate_limit_rpm — not yet enforced, tracked for Phase 4)

### Key Endpoints

| Method | Endpoint       | Description                          |
| ------ | -------------- | ------------------------------------ |
| GET    | `/reports`     | List published reports with filters  |
| GET    | `/reports/:id` | Single report with full indicators   |
| GET    | `/indicators`  | Query IOCs by type/value             |
| GET    | `/campaigns`   | List active campaigns                |
| GET    | `/feed`        | Paginated feed (JSON or STIX 2.1)    |
| GET    | `/stats`       | Aggregate stats by type/country/date |

### Implemented Endpoints

| Method  | Endpoint   | Description                                        |
| ------- | ---------- | -------------------------------------------------- |
| GET     | `/reports` | List published reports with filters and pagination |
| OPTIONS | `/reports` | CORS preflight                                     |

### Not yet implemented

- GET /reports/:id (single report endpoint)
- GET /indicators
- GET /campaigns
- GET /stats
- STIX 2.1 format (Phase 4, Elite Sentinel only)

### Query Parameters (GET /api/v1/reports)

- `type` — scam type (phishing_email, smishing, etc.)
- `country` — ISO 2-letter country code
- `severity` — minimum severity (1–5)
- `from` — ISO 8601 date (published_at ≥)
- `to` — ISO 8601 date (published_at ≤)
- `is_novel` — true/false
- `limit` — max results (1–200, default 50)
- `cursor` — base64-encoded published_at for pagination

### Response Format

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "phishing_email",
      "severity": 4,
      "country_code": "NG",
      "summary": "Plain-English summary...",
      "ai_tags": ["bank_impersonation", "credential_harvest"],
      "indicators": [
        { "type": "domain", "value": "accessbank-secure.net" },
        { "type": "email_address", "value": "noreply@accessbank-secure.net" }
      ],
      "confirm_count": 12,
      "is_novel": false,
      "published_at": "2026-05-01T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1420,
    "page": 1,
    "limit": 50
  }
}
```

---

## Leaderboard System

### Views

✅ **Fully implemented** at `/leaderboard`

- Global all-time
- Monthly (resets 1st of each month)
- By country (NG, GB, GH, ZA, US, KE)
- Dashboard sidebar shows top 5 users

### Leaderboard Entry

- Rank, username, badge, country flag, points, report count
- Current user's rank always shown even if outside top 20

### Implementation

- PostgreSQL function `get_monthly_leaderboard()` sums points_ledger entries for current month
- All-time leaderboard sorts users table directly by points
- Country leaderboards filtered by country_code on users table
- Server-side pagination and sorting for performance

---

## Badge Tier System

| Badge             | Threshold         | Visual          | Unlocks                                  |
| ----------------- | ----------------- | --------------- | ---------------------------------------- |
| 🛡 Watcher         | 0–2,499 pts       | Grey shield     | Submit, browse feed                      |
| 🛡 Guardian        | 2,499-4,999 pts   | Green shield    | Community voting                         |
| 🛡 Sentinel        | 5,000–9,999 pts   | Blue shield     | Campaign tagging, advanced filters       |
| ⭐ Elite Sentinel | 10,000–19,999 pts | Gold shield     | Moderator queue, STIX export, API access |
| 🔱 Sage           | 20,000+ pts       | Platinum shield | Strategic advisor role                   |

Badge updates automatically via Postgres trigger on `users.points`.

---

## Moderation Queue

- Reports with `status = 'pending'` appear in the queue
- High severity (≥4) or `is_novel = true` reports are prioritised
- Moderator actions: Publish, Reject, Under Review, Edit summary
- Moderator identity logged in `reports.moderated_by` and `reports.moderated_at`
- Access: `is_moderator = true` on user, or Elite Sentinel badge

---

## Key UX Principles (Non-Negotiable)

1. **No jargon on user-facing screens.** "What scam did you receive?" not "Submit an IOC"
2. **Mobile-first.** Design for 390px width. Desktop is secondary.
3. **Points in 3 seconds.** Do not wait for moderation before showing reward.
4. **Privacy reassurance on every step.** "Your name and email are never stored."
5. **Social proof.** Show live stats: "X reports submitted today", "Protecting Y people"
6. **One primary action per screen.** No competing CTAs.
7. **Progressive disclosure.** Context fields (Screen 3) are optional — don't block submission.

---

## Previously Phase 2 (Now Complete)

✅ **Community Voting** — implemented at report detail pages

- Users with Guardian+ badge can confirm or dispute reports
- Real-time vote counts on detail page
- Voting state machine: signed-out → authenticated → voted
- Optimistic UI updates during voting

✅ **Country-level Leaderboards** — implemented with global, monthly, and country tabs

- `/leaderboard` page with tab routing
- Countries: NG, GB, GH, ZA, US, KE
- Monthly leaderboard via PostgreSQL function
- Sidebar shows top 5 global users

---

## Phase 3 Features (Complete — Already Shipped)

✅ **User Profile** (`/profile`)

- Display name and bio (editable by owner)
- Country selection (via country code dropdown)
- Avatar generated from initials
- Character counters for bio and display name

✅ **Report Detail Page** (`/reports/[id]`)

- Full report content with indicators grouped by type
- AI-extracted tags displayed with semantic coloring
- Novel campaign badge indicator
- View count tracking (read-once per session)
- Community voting component

✅ **Researcher API** (`/api/v1/reports`)

- Bearer token authentication via API key
- Query filters: type, country, severity, date range, is_novel, limit, cursor pagination
- Response includes full indicators embedded
- Rate limiting per API key
- CORS-enabled

✅ **Researcher Application Flow** (`/researchers/apply`)

- Application form for non-authenticated users
- Form validation (full name, organisation, role, use case, portfolio URL)
- Admin approval via PostgreSQL function
- API key generation (sv_live\* format, md5 hashed)
- Secure key delivery (shown once, must be copied immediately)
- Approval/rejection workflow with email notification support

---

## Phase 4 Roadmap (Planned — Not Yet Implemented)

- **Automate API key delivery** — Resend (free tier) + admin UI at /admin/applications for Approve/Reject without SQL Editor
- **Rate limiting enforcement** — validate rate_limit_rpm on /api/v1/reports and reject with 429 if exceeded
- **Email digest** — weekly top scams by country, sent to subscribed users
- **Make repo public + CLA setup** — open source contributions with Contributor License Agreement
- **STIX 2.1 export** — for Elite Sentinel users accessing /api/v1/reports?format=stix
- **Campaign clustering UI** — show campaign_id and related reports, campaign_id no longer always null
- **Streak bonuses** — STREAK_7_DAY and STREAK_30_DAY constants already defined, code paths needed in points calculation
- **Android app** — native mobile client using v1/reports API
- **VOTE_CONFIRM points** — when user votes and their vote matches majority, award bonus points (trigger on votes table needed)
- **PNG/PDF metadata stripping** — extend file upload to preserve privacy for additional formats beyond JPEG

---

## Current Status

**What's fully working:**

- User registration and authentication (Google OAuth + email/password)
- Scam submission with AI triage, deduplication, file upload, points
- Public feed with tab filtering, clickable cards to detail pages
- Report detail pages with IOCs, tags, community voting
- User profile with display name, bio, country
- Leaderboard (global, monthly, country tabs)
- Shield score card on homepage sidebar with progress bar
- Researcher API key application flow
- Public /api/v1/reports endpoint with Bearer token auth

**What's placeholder/incomplete:**

- view_count increment removed from report detail page (needs proper server action implementation)
- Rate limiting defined but not enforced
- Streak bonuses (constants defined, no code paths)
- VOTE_CONFIRM points (constant defined, no code path)
- UK/NG leaderboard tabs in sidebar shown but disabled (full page has them working)
- API key delivery is manual (TRAN runs SQL, emails key manually)
- Campaign clustering (campaign_id always null for now)
- PNG/PDF metadata stripping deferred

---

## Previous Phase 1 (MVP) Features
