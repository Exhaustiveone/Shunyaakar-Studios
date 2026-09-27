-- Shunyaakar studio desk: database schema.
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run again.

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
  status      text not null default 'new' check (status in ('new', 'replied', 'done', 'spam')),
  notes       text,
  replied_at  timestamptz
);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_email_idx on public.enquiries (email);

-- Replies sent from the desk, kept with the enquiry they answer.
create table if not exists public.enquiry_replies (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  enquiry_id  uuid not null references public.enquiries (id) on delete cascade,
  subject     text not null,
  body        text not null
);
create index if not exists enquiry_replies_enquiry_idx on public.enquiry_replies (enquiry_id);

-- "Letters from the set" subscribers. token is their private unsubscribe key.
create table if not exists public.subscribers (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  email            text not null unique,
  status           text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  token            uuid not null unique default gen_random_uuid(),
  source           text,
  unsubscribed_at  timestamptz
);

-- The newsletters themselves: drafts while you write, then "sent" once they go out.
create table if not exists public.letters (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  subject     text not null,
  body        text not null,
  status      text not null default 'draft',
  sent_at     timestamptz,
  sent_to     integer not null default 0
);
-- (for databases created before drafts existed)
alter table public.letters add column if not exists updated_at timestamptz not null default now();
alter table public.letters add column if not exists sent_at timestamptz;
alter table public.letters alter column status set default 'draft';
alter table public.letters drop constraint if exists letters_status_check;
alter table public.letters add constraint letters_status_check check (status in ('draft', 'sent', 'partial'));
create index if not exists letters_updated_idx on public.letters (updated_at desc);

-- Lock the tables. Row Level Security with no policies means the public
-- (anon) key can read or write nothing. Only the Netlify functions, which
-- hold the secret key, can touch the data.
alter table public.enquiries       enable row level security;
alter table public.enquiry_replies enable row level security;
alter table public.subscribers     enable row level security;
alter table public.letters         enable row level security;
