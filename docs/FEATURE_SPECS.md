# UbuntuScamBank — Feature Specs & UX Reference

> **Living document** — this reflects the current best understanding of the project as of the initial brainstorming phase. Decisions, structures, and specs here are subject to change as development progresses. Update this file when anything meaningfully changes.
>
> ---

---

## Submission Flow (4 screens, under 60 seconds)

Designed for non-technical users on mobile. Every screen has one job.

### Screen 1 — Upload

- Paste text directly, or tap to upload a screenshot/file
- iOS/Android share extension tip: "Tap Share in your email app and select ScamVault"
- Progress bar at top (25%)
- CTA: "Next →"

### Screen 2 — AI Review

- Shows auto-classification results: type, severity, confidence, IOCs found
- User can override type if wrong (chip selector)
- User can adjust severity (dot selector, 1–5)
- CTA: "Looks right →" or "Edit details"
- Progress bar (50%)

### Screen 3 — Context (optional)

- Free text: "What made it convincing?"
- Channel selector: Email, WhatsApp, SMS, Phone call, Social media
- Country dropdown
- Privacy note: "Your personal info is never stored"
- CTA: "Submit report 🛡"
- Progress bar (75%)

### Screen 4 — Confirmation

- Points burst animation (+10, +25 for novel, etc.)
- Progress bar toward next badge tier
- "You're helping protect thousands of people"
- Share buttons: WhatsApp, X, Copy link
- CTA: "Back to feed"
- Progress bar (100%)

---

## Public Feed

- Browsable without login
- Each card shows: scam type, severity badge, country flag, summary, IOC count, confirm/dispute count
- Filters: type, country, date range, severity
- Search across summaries and IOCs
- No raw content shown publicly — summary + indicators only

---

## Researcher API

Base URL: `https://api.ubuntuscambank.org/v1`

Authentication: API key in header (`X-API-Key`)
Rate limit: 60 requests/minute (configurable per key in `api_keys` table)

### Key Endpoints

| Method | Endpoint       | Description                          |
| ------ | -------------- | ------------------------------------ |
| GET    | `/reports`     | List published reports with filters  |
| GET    | `/reports/:id` | Single report with full indicators   |
| GET    | `/indicators`  | Query IOCs by type/value             |
| GET    | `/campaigns`   | List active campaigns                |
| GET    | `/feed`        | Paginated feed (JSON or STIX 2.1)    |
| GET    | `/stats`       | Aggregate stats by type/country/date |

### Query Parameters (GET /reports)

- `type` — filter by scam type
- `country` — ISO 2-letter country code
- `severity` — minimum severity (1–5)
- `since` — ISO 8601 date
- `limit` — max results (default 50, max 500)
- `format` — `json` or `stix` (Elite Sentinel only)

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

- Global all-time
- Monthly (resets 1st of each month)
- By country
- By category (e.g. Top Phishing Reporters)

### Leaderboard Entry

- Rank, username, badge, country flag, points, report count
- Current user's rank always shown even if outside top 20

### Redis Implementation (Upstash)

- One sorted set per leaderboard view: `leaderboard:global`, `leaderboard:monthly`, `leaderboard:NG`, etc.
- `ZADD` on every points award
- `ZREVRANK` for user's current rank
- `ZREVRANGE` for top N

---

## Badge Tier System

| Badge             | Threshold       | Visual       | Unlocks                                  |
| ----------------- | --------------- | ------------ | ---------------------------------------- |
| 🛡 Watcher         | 0–499 pts       | Grey shield  | Submit, browse feed                      |
| 🛡 Guardian        | 500–1,999 pts   | Green shield | Community voting                         |
| 🛡 Sentinel        | 2,000–4,999 pts | Blue shield  | Campaign tagging, advanced filters       |
| ⭐ Elite Sentinel | 5,000+ pts      | Gold shield  | Moderator queue, STIX export, API access |

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

## Phase 2 Features (Not in MVP — Do Not Build Yet)

- Email digest ("This week's top scams in your country")
- Browser/email share extension
- Campaign clustering UI
- Country-level leaderboards
- Mobile app (Android first)
- STIX 2.1 export (reserved for Elite Sentinel)
- Verified org accounts (NCSC, Action Fraud, banks)
