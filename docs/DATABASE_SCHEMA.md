# UbuntuScamBank — Database Schema

## PostgreSQL via Supabase

> **Living document** — updated to reflect current implementation as of v0.9.4.
>
> ---

---

## Tables Overview

| Table                     | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `users`                   | Registered accounts — points, badges, roles                    |
| `campaigns`               | Clusters of related scam reports                               |
| `reports`                 | Core table — every submitted scam                              |
| `indicators`              | IOCs extracted per report (domains, IPs, emails, phones, URLs) |
| `submissions`             | Links a user to a report, tracks points awarded                |
| `votes`                   | Community confirm/dispute votes on reports                     |
| `points_ledger`           | Full audit trail of every point event                          |
| `api_keys`                | Researcher API keys                                            |
| `researcher_applications` | API access applications awaiting review                        |
| `feedback`                | Contact form submissions from the /feedback page               |

## Views Overview

| View                | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `leaderboard_users` | Safe public subset of users (no email) — anon SELECT granted           |
| `public_reports`    | Safe public subset of reports (no `raw_content`) — anon SELECT granted |

---

## Full Schema

```sql
-- USERS
create table users (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  email         text unique,
  display_name  text,
  bio           text,
  country_code  char(2),
  points        integer not null default 0,
  badge         text not null default 'watcher'
                check (badge in ('watcher','guardian','sentinel','elite_sentinel','sage')),
  is_researcher boolean not null default false,
  is_moderator  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- CAMPAIGNS (clusters of related scams)
create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null,
  first_seen    timestamptz,
  last_seen     timestamptz,
  report_count  integer not null default 0,
  created_at    timestamptz not null default now()
);

-- REPORTS (core table)
create table reports (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid references campaigns(id) on delete set null,
  submitted_by    uuid references users(id) on delete set null,
  type            text not null
                  check (type in (
                    'phishing_email','smishing','vishing',
                    'investment_fraud','romance_scam',
                    'business_email_compromise','tech_support',
                    'crypto_fraud','other'
                  )),
  severity        smallint not null default 1
                  check (severity between 1 and 5),
  status          text not null default 'pending'
                  check (status in ('pending','published','rejected','under_review')),
  country_code    char(2),
  summary         text,
  raw_content     text,
  content_hash    text unique,
  ai_category     text,
  ai_confidence   numeric(4,3),
  ai_tags         text[],
  file_path       text,
  file_type       text,
  is_novel        boolean not null default false,
  view_count      integer not null default 0,
  confirm_count   integer not null default 0,
  dispute_count   integer not null default 0,
  submitted_at    timestamptz not null default now(),
  published_at    timestamptz,
  moderated_by    uuid references users(id) on delete set null,
  moderated_at    timestamptz
);

-- INDICATORS OF COMPROMISE (extracted by AI)
create table indicators (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references reports(id) on delete cascade,
  type         text not null
               check (type in (
                 'domain','ip_address','email_address',
                 'phone_number','url','sender_name','file_hash'
               )),
  value        text not null,
  is_verified  boolean not null default false,
  extracted_at timestamptz not null default now()
);

-- SUBMISSIONS (links user to report, tracks points earned)
create table submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  report_id       uuid not null references reports(id) on delete cascade,
  points_awarded  integer not null default 0,
  bonus_reason    text,
  submitted_at    timestamptz not null default now(),
  unique (user_id, report_id)
);

-- COMMUNITY VOTES
create table votes (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references reports(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  vote       text not null check (vote in ('confirm','dispute')),
  voted_at   timestamptz not null default now(),
  unique (report_id, user_id)
);

-- POINTS LEDGER (full audit trail)
create table points_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  delta      integer not null,
  reason     text not null,
  ref_id     uuid,
  created_at timestamptz not null default now()
);

-- RESEARCHER APPLICATIONS
create table researcher_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  full_name       text not null,
  organisation    text not null,
  role            text not null,
  use_case        text not null,
  portfolio_url   text,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references users(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- RESEARCHER API KEYS
create table api_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  key_hash        text unique not null,
  label           text,
  rate_limit_rpm  integer not null default 60,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz
);

-- FEEDBACK (contact form submissions — no public RLS policies)
create table feedback (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  role         text not null,
  organisation text,
  message      text not null,
  created_at   timestamptz not null default now()
);
```

---

## Views

### `leaderboard_users`

Safe public read-only view of `users`. Excludes `email`, `bio`, `is_moderator`, `is_researcher`. Created in `fix/email-exposure` to prevent anon REST API access to raw user data.

```sql
create or replace view public.leaderboard_users
with (security_invoker = false)
as
  select id, username, display_name, points, badge, country_code
  from public.users;

grant select on public.leaderboard_users to anon, authenticated;
revoke select on public.users from anon;
alter view public.leaderboard_users owner to postgres;
```

### `public_reports`

Safe public read-only view of `reports`. Excludes `raw_content` (may contain victim PII not fully stripped). Created in `feat/ops-moderation-queue` to close RLS exposure. All public-facing queries use this view via the anon/session client; ops routes and the submit route continue to use the base table via admin client.

```sql
create or replace view public.public_reports as
  select
    id, campaign_id, submitted_by, type, severity, status, country_code,
    summary, content_hash, ai_category, ai_confidence, ai_tags,
    file_path, file_type, is_novel, view_count, confirm_count,
    dispute_count, submitted_at, published_at, moderated_by, moderated_at
  from public.reports;
  -- raw_content intentionally excluded

grant select on public.public_reports to anon, authenticated;
revoke select on public.reports from anon;
alter view public.public_reports owner to postgres;
```

**Note on view column nullability:** Supabase's type generator marks all view columns as nullable regardless of the underlying column constraints. Null guards (`?? ''`, `?? 0`, `?? 'other'`) are required at all usage sites in application code.

---

## Indexes

```sql
create index on reports (type);
create index on reports (status);
create index on reports (country_code);
create index on reports (submitted_at desc);
create index on reports (campaign_id);
create index on indicators (report_id);
create index on indicators (type, value);
create index on votes (report_id);
create index on points_ledger (user_id, created_at desc);
create index on feedback (created_at desc);
```

---

## RLS Policies

### reports

Direct anon SELECT revoked. All public queries go through `public_reports` view.
Admin client (service role) reads the base table directly for ops routes and raw_content access.

### public_reports (view)

- anon and authenticated SELECT granted via `GRANT SELECT ON public.public_reports`

### indicators

- `"Indicators for published reports are publicly readable"` — subqueries `public_reports` (not `reports` directly, since anon SELECT on `reports` was revoked):

```sql
create policy "Indicators for published reports are publicly readable"
on public.indicators for select
using (
  exists (
    select 1 from public.public_reports
    where public_reports.id = indicators.report_id
      and public_reports.status = 'published'
  )
);
```

### votes

- INSERT: `"Authenticated users can vote on published reports"` — auth.uid() = user_id, report must be published
- SELECT: `"Votes are publicly readable"` — using (true)

### users

Direct anon SELECT revoked. All leaderboard/public queries go through `leaderboard_users` view.

- UPDATE: `"Users can update own profile"` — auth.uid() = id
- Authenticated SELECT on own row still works via RLS

### leaderboard_users (view)

- anon and authenticated SELECT granted via `GRANT SELECT ON public.leaderboard_users`

### api_keys

- RLS enabled, policy: `"Users can read their own API keys"` — auth.uid() = user_id

### researcher_applications

- INSERT: `"Authenticated users can submit applications"` — auth.uid() = user_id
- SELECT: `"Users can read their own applications"` — auth.uid() = user_id

### feedback

- RLS enabled, no public policies. All reads and writes go through admin client (service role).

### storage.objects (scam-reports bucket)

- INSERT: users can upload to their own folder only
- SELECT: users can read their own files
- DELETE: users can delete their own files
- Moderators use `createAdminClient()` to generate signed URLs for any file, bypassing storage RLS

---

## Functions

### Get Monthly Leaderboard

Accepts an optional `target_month` date parameter (defaults to current month). Added in `feature/sidebar-leaderboard-dynamic`.

```sql
create or replace function get_monthly_leaderboard(
  target_month date default date_trunc('month', now())::date
)
returns table (
  id            uuid,
  username      text,
  display_name  text,
  badge         text,
  country_code  char(2),
  monthly_points bigint
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.username,
    u.display_name,
    u.badge,
    u.country_code,
    coalesce(sum(pl.delta) filter (where pl.delta > 0), 0)::bigint as monthly_points
  from users u
  inner join points_ledger pl on pl.user_id = u.id
  where pl.created_at >= date_trunc('month', target_month::timestamptz)
    and pl.created_at < date_trunc('month', target_month::timestamptz) + interval '1 month'
  group by u.id, u.username, u.display_name, u.badge, u.country_code
  having coalesce(sum(pl.delta) filter (where pl.delta > 0), 0) > 0
  order by monthly_points desc
  limit 50;
$$;

grant execute on function get_monthly_leaderboard(date) to anon, authenticated;
```

### Approve Researcher Application

Generates an API key and grants researcher status to the user. The raw key (`sv_live_*`) is returned once and never stored in plaintext. Called by `POST /api/ops/applications/[id]/approve` — no longer requires manual SQL Editor execution.

```sql
create or replace function approve_researcher_application(p_application_id uuid)
returns text
language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_raw_key text;
  v_key_hash text;
begin
  select user_id into v_user_id
  from researcher_applications
  where id = p_application_id;

  if v_user_id is null then
    raise exception 'Application not found';
  end if;

  -- Generate raw key
  v_raw_key := 'sv_live_'
    || replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');
  v_key_hash := md5(v_raw_key);

  insert into api_keys (user_id, key_hash, label)
  values (v_user_id, v_key_hash, 'Approved ' || now()::date);

  update researcher_applications
  set status = 'approved', reviewed_at = now()
  where id = p_application_id;

  update users set is_researcher = true where id = v_user_id;

  return v_raw_key;
end;
$$;

grant execute on function approve_researcher_application(uuid) to authenticated;
```

### Reject Researcher Application

```sql
create or replace function reject_researcher_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update researcher_applications
  set status = 'rejected', reviewed_at = now()
  where id = p_application_id and status = 'pending';

  if not found then
    raise exception 'Application not found or not pending.';
  end if;
end;
$$;

grant execute on function reject_researcher_application(uuid) to authenticated;
```

---

## API Key Delivery Workflow

1. User submits application via `/researchers/apply`
2. Moderator visits `/ops/applications` and clicks Approve
3. Route calls `approve_researcher_application(id)` RPC
4. Raw key returned to moderator UI — displayed once in copy-once modal
5. Resend email automatically sent to researcher with the key (gated on `RESEND_API_KEY`)
6. Key is hashed with PostgreSQL `md5()` and stored in `api_keys.key_hash`
7. User includes key in `Authorization: Bearer sv_live_...` header on `/api/v1/` requests
8. Server hashes incoming key with `blueimp-md5` and looks up in `api_keys.key_hash`

**Important:** The hash must match on both sides. Any change to the hashing algorithm breaks the lookup.

---

## MD5 Hashing (Free Tier Constraint)

`pgcrypto` is not available on Supabase free tier. PostgreSQL's built-in `md5()` is used:

- **Why MD5?** pgcrypto unavailable. MD5 is acceptable for a non-password lookup hash (API keys are high-entropy).
- **Client-side match:** `blueimp-md5` npm package in `validateApiKey.ts` — must match PostgreSQL `md5()` output exactly.

---

## Triggers & Functions

### Badge Auto-Update

Fires before any update to `users.points` — recalculates badge tier automatically.

```sql
create or replace function update_badge()
returns trigger language plpgsql as $$
begin
  new.badge := case
    when new.points >= 20000 then 'sage'
    when new.points >= 10000 then 'elite_sentinel'
    when new.points >= 5000  then 'sentinel'
    when new.points >= 2500  then 'guardian'
    else 'watcher'
  end;
  return new;
end;
$$;

create trigger trg_badge_update
before update of points on users
for each row execute function update_badge();
```

### Vote Count Sync

Fires after every insert on `votes` — keeps `confirm_count` and `dispute_count` on `reports` in sync.

```sql
create or replace function sync_vote_counts()
returns trigger language plpgsql as $$
begin
  if new.vote = 'confirm' then
    update reports set confirm_count = confirm_count + 1 where id = new.report_id;
  else
    update reports set dispute_count = dispute_count + 1 where id = new.report_id;
  end if;
  return new;
end;
$$;

create trigger trg_vote_sync
after insert on votes
for each row execute function sync_vote_counts();
```

---

## Badge Tiers Reference

| Badge          | Points        | Unlocks                             |
| -------------- | ------------- | ----------------------------------- |
| Watcher        | 0–2,499       | Submit reports, browse feed         |
| Guardian       | 2,500–4,999   | Community voting (confirm/dispute)  |
| Sentinel       | 5,000–9,999   | Campaign tagging, advanced filters  |
| Elite Sentinel | 10,000–19,999 | Moderator queue access, STIX export |
| Sage           | 20,000+       | Strategic advisor role              |

---

## Points Events Reference

| Event                                            | Points    |
| ------------------------------------------------ | --------- |
| First submission (welcome bonus)                 | +50       |
| Standard submission                              | +10       |
| High severity report (≥4)                        | +10 bonus |
| Novel campaign                                   | +25 bonus |
| Duplicate (confirms volume)                      | +5        |
| Full metadata submitted (file + written context) | +5 bonus  |
| Community vote confirms your report              | +15 \*    |
| 7-day submission streak                          | +20 \*    |
| 30-day submission streak                         | +75 \*    |
| Report featured in weekly digest                 | +20 \*    |
| Flagged/abusive submission                       | −20       |

\* Constants defined in `calculate.ts`, code paths not yet implemented.
