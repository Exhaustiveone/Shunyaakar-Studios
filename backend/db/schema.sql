-- Shunyaakar backend schema. The server runs this on every start (inside one
-- transaction, under an advisory lock), so it must stay idempotent.
-- No personal data or credentials belong in this file.

create extension if not exists pgcrypto;

-- Messages from the "Work with us" contact form.
create table if not exists public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  project     text,
  timeline    text,
  message     text not null,
  status      text not null default 'new',
  notes       text,
  replied_at  timestamptz
);
alter table public.enquiries drop constraint if exists enquiries_status_check;
alter table public.enquiries add constraint enquiries_status_check check (status in ('new', 'replied', 'done', 'spam'));
alter table public.enquiries drop constraint if exists enquiries_lengths_check;
alter table public.enquiries add constraint enquiries_lengths_check check (
  char_length(name) between 1 and 120 and char_length(email) between 3 and 254
  and char_length(message) between 1 and 5000 and coalesce(char_length(project), 0) <= 120
  and coalesce(char_length(timeline), 0) <= 200 and coalesce(char_length(notes), 0) <= 5000
);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_email_created_idx on public.enquiries (email, created_at desc);

-- Replies sent to enquirers from the desk (by email, through SMTP).
create table if not exists public.enquiry_replies (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  enquiry_id  uuid not null references public.enquiries (id) on delete cascade,
  subject     text not null,
  body        text not null
);
alter table public.enquiry_replies add column if not exists sent_to text;
alter table public.enquiry_replies add column if not exists message_id text;
create index if not exists enquiry_replies_enquiry_idx on public.enquiry_replies (enquiry_id, created_at);

-- Newsletter sign-ups ("Letters from the set"). Stored only: never sent anywhere.
create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null unique,
  constraint newsletter_email_format check (char_length(email) between 3 and 254 and email = lower(email))
);
create index if not exists newsletter_created_idx on public.newsletter_subscribers (created_at desc);

-- People who can open the /desk. Only role 'admin' exists today.
create table if not exists public.admin_users (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  email            text not null unique,
  role             text not null default 'admin',
  password_hash    text,
  failed_attempts  integer not null default 0,
  locked_until     timestamptz,
  last_login_at    timestamptz,
  constraint admin_users_role_check check (role in ('admin')),
  constraint admin_users_email_lower check (email = lower(email))
);

-- Desk sessions. Only a SHA-256 hash of the session token is stored; the token
-- itself lives in an HttpOnly cookie in the admin's browser.
create table if not exists public.admin_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.admin_users (id) on delete cascade,
  token_hash    bytea not null unique,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  last_seen_at  timestamptz not null default now(),
  user_agent    text
);
create index if not exists admin_sessions_user_idx on public.admin_sessions (user_id);
create index if not exists admin_sessions_expires_idx on public.admin_sessions (expires_at);

-- Lock every table against Supabase's public REST API: RLS on, no policies.
-- The backend connects as the database owner over Postgres, so it isn't affected.
alter table public.enquiries              enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.admin_users            enable row level security;
alter table public.admin_sessions         enable row level security;
alter table public.enquiry_replies        enable row level security;

-- Belt and braces on Supabase: take away the public API roles' table rights too.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.enquiries, public.newsletter_subscribers, public.admin_users, public.admin_sessions, public.enquiry_replies from %I', r);
    end if;
  end loop;
end $$;
