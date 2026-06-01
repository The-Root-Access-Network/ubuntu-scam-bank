# UbuntuScamBank — Database Schema

## PostgreSQL via Supabase

> **Living document** — this reflects the current best understanding of the project as of the initial brainstorming phase. Decisions, structures, and specs here are subject to change as development progresses. Update this file when anything meaningfully changes.
>
> ---

---

## Tables Overview

| Table           | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `users`         | Registered accounts — points, badges, roles                    |
| `campaigns`     | Clusters of related scam reports                               |
| `reports`       | Core table — every submitted scam                              |
| `indicators`    | IOCs extracted per report (domains, IPs, emails, phones, URLs) |
| `submissions`   | Links a user to a report, tracks points awarded                |
| `votes`         | Community confirm/dispute votes on reports                     |
| `points_ledger` | Full audit trail of every point event                          |
| `api_keys`      | Researcher API keys                                            |

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
```

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
```

---

## RLS Policies

### reports

- `"Published reports are publicly readable"` — `using (status = 'published')`

### indicators

- `"Indicators for published reports are publicly readable"` — exists()
  subquery checking reports.status = 'published'

### votes

- INSERT: `"Authenticated users can vote on published reports"` —
  auth.uid() = user_id, report must be published
- SELECT: `"Votes are publicly readable"` — using (true)

### users

- SELECT: `"Leaderboard fields are publicly readable"` — using (true)
- UPDATE: `"Users can update own profile"` — auth.uid() = id

### api_keys

- RLS enabled, policy: `"Users can read their own API keys"` —
  auth.uid() = user_id

### researcher_applications

- INSERT: `"Authenticated users can submit applications"` —
  auth.uid() = user_id
- SELECT: `"Users can read their own applications"` —
  auth.uid() = user_id

### storage.objects (scam_reports bucket)

- INSERT: users can upload to their own folder only
- SELECT: users can read their own files
- DELETE: users can delete their own files

---

## Functions

### Get Monthly Leaderboard

```sql
create or replace function get_monthly_leaderboard()
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
  where pl.created_at >= date_trunc('month', now() at time zone 'UTC')
  group by u.id, u.username, u.display_name, u.badge, u.country_code
  having coalesce(sum(pl.delta) filter (where pl.delta > 0), 0) > 0
  order by monthly_points desc
  limit 50;
$$;
```

### Approve Researcher Application

Generates an API key and grants researcher status to the user. The raw key (sv_live\*) is returned once and never stored in plaintext.

```sql
create or replace function approve_researcher_application(app_id uuid)
returns table (
  raw_key text,
  message text
) language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_key_part1 text;
  v_key_part2 text;
  v_key_hash text;
  v_raw_key text;
begin
  -- Fetch the application and user
  select user_id into v_user_id
  from researcher_applications
  where id = app_id;

  if v_user_id is null then
    raise exception 'Application not found';
  end if;

  -- Generate raw key
  v_raw_key := 'sv_live_'
  || replace(gen_random_uuid()::text, '-', '')
  || replace(gen_random_uuid()::text, '-', '');
  v_key_hash := md5(v_raw_key);

  -- Insert API key
  insert into api_keys (user_id, key_hash, label)
  values (v_user_id, v_key_hash, 'Approved ' || now()::date);

  -- Update application status
  update researcher_applications
  set status = 'approved', reviewed_at = now()
  where id = app_id;

  -- Grant researcher status
  update users set is_researcher = true where id = v_user_id;

  return query select v_raw_key, 'Application approved. API key shown above. Store it securely — it will not be displayed again.'::text;
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
2. Admin runs `SELECT approve_researcher_application(app_id)` in SQL Editor or via admin UI (Phase 4)
3. Raw key is displayed once (modal or page view) — **user must copy immediately**
4. Key is hashed with PostgreSQL `md5()` and stored in `api_keys.key_hash`
5. Admin emails the user the raw key (manual process until Phase 4 Resend integration)
6. User includes key in `X-API-Key: sv_live_...` header on `/api/v1/reports` requests
7. Server hashes the incoming key with blueimp-md5 (client-side equivalent of PostgreSQL md5()) and does lookup in `api_keys.key_hash`

**Important:** The hash must match on both sides. Any change to the hashing algorithm or salt breaks the lookup.

---

## MD5 Hashing (Free Tier Constraint)

pgcrypto extension (with SHA-256, bcrypt, etc.) is not available on Supabase free tier. PostgreSQL's built-in `md5()` function is used as a trade-off:

- **Why MD5?** pgcrypto not available. MD5 is acceptable for a non-password lookup hash (API keys are high-entropy).
- **Client-side match:** blueimp-md5 npm package in submit route and v1/reports route — must match PostgreSQL `md5()` output exactly
- **Signature:** `md5('sv_live_...')` on both sides

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
    when new.points >= 2500   then 'guardian'
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

| Badge          | Points        | Unlocks                            |
| -------------- | ------------- | ---------------------------------- |
| Watcher        | 0–2500        | Basic submission, leaderboard      |
| Guardian       | 2,499-4,999   | Community voting                   |
| Sentinel       | 5,000–9,999   | Campaign tagging, advanced filters |
| Elite Sentinel | 10,000–19,999 | Moderator queue, STIX export       |
| Sage           | 20,000+       | Strategic advisor role             |

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
| Community vote confirms your report              | +15       |
| 7-day submission streak                          | +20       |
| Flagged/abusive submission                       | −20       |
