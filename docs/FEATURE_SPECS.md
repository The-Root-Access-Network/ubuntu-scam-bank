# UbuntuScamBank — Feature Specs & UX Reference

> **Living document** — updated to reflect current implementation as of v0.9.4.
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

File-only submissions are supported — a file without any pasted text is a valid submission. The triage pipeline receives a fallback prompt when no text is present.

Note: The 4-screen mobile wizard described in the original brainstorm was not implemented. The single-form approach was chosen for simplicity. The multi-step flow remains a consideration for a future mobile app.

---

## Public Feed

✅ **Fully implemented.** Live at `https://scambank.ubuntubridgeinitiatives.org/`

- Browsable without login
- Homepage shows latest 6 reports with "View all reports →" link
- `/reports` page — paginated (20 per page), filterable by type and country
- Each card links to a full report detail page
- No raw content shown publicly — summary + indicators only via `public_reports` view
- `raw_content` column excluded from anon-accessible data at the database level

---

## Researcher API

Base URL: `https://scambank.ubuntubridgeinitiatives.org/api/v1`

Authentication: Bearer token in Authorization header
`Authorization: Bearer sv_live_...`

Rate limit: 60 requests/minute per key (stored in `api_keys.rate_limit_rpm` — header returned but not yet enforced)

### Implemented Endpoints

| Method  | Endpoint       | Description                                        |
| ------- | -------------- | -------------------------------------------------- |
| GET     | `/reports`     | List published reports with filters and pagination |
| OPTIONS | `/reports`     | CORS preflight                                     |
| GET     | `/reports/:id` | Single report with full indicators                 |
| OPTIONS | `/reports/:id` | CORS preflight                                     |

### Not yet implemented

- GET /indicators
- GET /campaigns
- GET /stats
- STIX 2.1 format (planned, Elite Sentinel only)

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
    "limit": 50,
    "next_cursor": "eyJpZCI6..."
  }
}
```

---

## Leaderboard System

✅ **Fully implemented** at `/leaderboard`

- Global all-time (via `leaderboard_users` view)
- Monthly — filterable by month via `get_monthly_leaderboard(target_month)` Postgres function
- By country — full-world dropdown (`CountrySelect` component), routes to `?tab={CC}`
- Dashboard sidebar shows top 2 dynamic country tabs based on aggregate points
- `MonthSelect` component generates options from launch month (2026-05) through current month

---

## Badge Tier System

| Badge             | Threshold         | Unlocks                                  |
| ----------------- | ----------------- | ---------------------------------------- |
| 🛡 Watcher         | 0–2,499 pts       | Submit, browse feed                      |
| 🛡 Guardian        | 2,500–4,999 pts   | Community voting                         |
| 🛡 Sentinel        | 5,000–9,999 pts   | Campaign tagging, advanced filters       |
| ⭐ Elite Sentinel | 10,000–19,999 pts | Moderator queue, STIX export, API access |
| 🔱 Sage           | 20,000+ pts       | Strategic advisor role                   |

Badge updates automatically via Postgres trigger on `users.points`.

---

## Moderation Queue

✅ **Implemented** at `/ops/reports`

- Reports with `status IN ('pending', 'under_review')` shown, oldest first
- Triage status badge: "Triage failed" (danger) / "Flagged for review" (warning) / "Pending" (neutral)
- Raw content preview (200 chars) with full report link
- Publish action: sets `status = 'published'`, `published_at`, `moderated_by`, `moderated_at`
- Reject action: sets `status = 'rejected'`, `moderated_by`, `moderated_at`
- Both actions use `requireModerator()` guard and admin client
- Modal confirmation pattern same as `UserActions`

---

## Ops Admin Panel (`/ops`)

✅ **Fully implemented**

Five-layer security model: middleware auth redirect, layout moderator check, page moderator check, API route guard via `requireModerator()`, no client-side admin state.

**Sections:**

- `/ops` — Overview with four stat cards (users, pending applications, published reports, pending moderation) — all clickable links
- `/ops/users` — Full user list with `ban`/`unban`/`delete` actions, server-side pagination (20/page), client-side search
- `/ops/applications` — Researcher application review (Pending/Approved/Rejected tabs) with approve/reject actions and API key delivery modal
- `/ops/reports` — Moderation queue (see above)
- `/ops/digest` — Fortnightly email digest preview and Resend Broadcasts workflow

**Shared utilities:**

- `src/lib/ops/requireModerator.ts` — session + moderator guard for all `/api/ops` routes
- `src/lib/email/send.ts` — Resend wrapper, always CCs `therootaccessnetwork@africybercore.com`
- `src/lib/email/templates.ts` — plain text templates for all ops action emails

---

## Email & Audience

✅ **Resend integration active**

- `src/lib/email/send.ts` — shared send utility gated on `RESEND_API_KEY`
- `src/lib/email/audience.ts` — `addToDigestAudience()` adds new users to Resend audience on registration (fire-and-forget, non-fatal)
- `src/app/auth/callback/route.ts` — calls `addToDigestAudience` after OAuth session establishment
- `GET /api/digest/preview` — moderator-only, returns fortnightly stats and top reports
- `/ops/digest` — digest preview UI with Resend Broadcasts workflow instructions
- Existing users imported to Resend audience manually via CSV export

Emails sent for: user bans/unbans/deletions, researcher approvals/rejections, API key delivery, contact form notifications.

---

## Key UX Principles (Non-Negotiable)

1. **No jargon on user-facing screens.** "What scam did you receive?" not "Submit an IOC"
2. **Mobile-first.** Design for 390px width. Desktop is secondary. Three breakpoints required minimum.
3. **Points in 3 seconds.** Do not wait for moderation before showing reward.
4. **Privacy reassurance on every step.** "Your name and email are never stored."
5. **Social proof.** Live stats in hero: reports submitted, contributors, countries.
6. **One primary action per screen.** No competing CTAs.
7. **Progressive disclosure.** Context fields are optional — don't block submission.

---

## Phase 3 Features (Complete — Already Shipped)

✅ **User Profile** (`/profile`) — display name, bio, country, avatar from initials

✅ **Report Detail Page** (`/reports/[id]`) — IOCs, tags, voting, view count, original submission toggle

✅ **Researcher API** (`/api/v1/reports`, `/api/v1/reports/:id`) — Bearer auth, filters, cursor pagination, CORS

✅ **Researcher Application Flow** (`/researchers/apply`) — form, admin approval via ops panel, Resend key delivery

---

## Phase 4 Status

✅ **Complete — Shipped:**

- Admin panel (`/ops`) with user management, application review, moderation queue, digest preview
- API key delivery via Resend (automated on approval)
- Email digest infrastructure (Resend audience sync, preview endpoint, ops page)
- `raw_content` RLS fix (`public_reports` view, anon access to base `reports` table revoked)
- Image triage via Claude vision API (JPEG, PNG, WebP)
- `/reports` paginated page with type/country filters
- Dynamic sidebar leaderboard country tabs
- Month picker on leaderboard (`get_monthly_leaderboard(target_month)`)
- FAQ accordion on homepage
- Custom SVG favicon
- Mobile responsiveness fixes (submission form country row, footer paragraph)

⏳ **Remaining / Not Yet Implemented:**

- Rate limiting enforcement — `rate_limit_rpm` header returned but nothing blocks exceeding it
- VOTE_CONFIRM points — constant defined in `calculate.ts`, no trigger or code path
- Streak bonuses — `STREAK_7_DAY` and `STREAK_30_DAY` constants defined, no code paths
- Campaign clustering — `campaign_id` always null, no clustering logic
- STIX 2.1 export — planned for Elite Sentinel tier
- Email digest automation — currently hybrid (manual Resend Broadcasts send)
- Open source prep — SECURITY.md, CLA setup, repo already public

---

## Current Status (v0.9.4)

**Fully working:**

- User registration and authentication (Google OAuth + email/password)
- Scam submission with AI triage (text + image via vision API), deduplication, file upload, points
- Public feed (homepage: 6 items; `/reports`: paginated 20/page with filters)
- Report detail pages with IOCs, tags, community voting, original submission toggle
- User profile with display name, bio, country
- Leaderboard (global, monthly with month picker, full-world country dropdown)
- Shield score card with tier progress bar
- Researcher API (`GET /api/v1/reports`, `GET /api/v1/reports/:id`)
- Researcher application → ops approval → Resend key delivery flow
- Ops panel: user management, application review, moderation queue, digest
- Resend audience sync on registration
- `raw_content` excluded from public API surface

**Placeholder / not yet implemented:**

- Rate limiting (defined, not enforced)
- Streak bonuses (constants defined, no code paths)
- VOTE_CONFIRM points (constant defined, no code path)
- Campaign clustering (`campaign_id` always null)
- STIX 2.1 export
- Digest automation (manual Resend Broadcasts workflow currently)
