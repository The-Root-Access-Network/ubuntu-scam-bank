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
  country_code  char(2),
  points        integer not null default 0,
  badge         text not null default 'watcher'
                check (badge in ('watcher','guardian','sentinel','elite_sentinel')),
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

## Triggers & Functions

### Badge Auto-Update

Fires before any update to `users.points` — recalculates badge tier automatically.

```sql
create or replace function update_badge()
returns trigger language plpgsql as $$
begin
  new.badge := case
    when new.points >= 5000 then 'elite_sentinel'
    when new.points >= 2000 then 'sentinel'
    when new.points >= 500  then 'guardian'
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

| Badge          | Points      | Unlocks                            |
| -------------- | ----------- | ---------------------------------- |
| Watcher        | 0–499       | Basic submission, leaderboard      |
| Guardian       | 500–1,999   | Community voting                   |
| Sentinel       | 2,000–4,999 | Campaign tagging, advanced filters |
| Elite Sentinel | 5,000+      | Moderator queue, STIX export       |

---

## Points Events Reference

| Event                               | Points    |
| ----------------------------------- | --------- |
| First submission (welcome bonus)    | +50       |
| Standard submission                 | +10       |
| High severity report (≥4)           | +10 bonus |
| Novel campaign                      | +25 bonus |
| Duplicate (confirms volume)         | +5        |
| Full metadata submitted             | +5 bonus  |
| Community vote confirms your report | +15       |
| 7-day submission streak             | +20       |
| Flagged/abusive submission          | −20       |
