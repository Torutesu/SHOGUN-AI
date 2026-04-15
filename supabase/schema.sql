-- SHOGUN Supabase Schema
-- Run this in Supabase SQL Editor to set up the cloud sync tables.

-- Enable pgvector
create extension if not exists vector;

-- Pages (synced from local PGLite)
create table if not exists pages (
  id bigint generated always as identity primary key,
  user_id text not null,
  device_id text not null,
  slug text not null,
  type text not null check (type in ('person', 'company', 'session', 'concept')),
  title text not null,
  compiled_truth text not null default '',
  timeline text not null default '',
  content_hash text not null default '',
  frontmatter jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);

-- Tags
create table if not exists tags (
  id bigint generated always as identity primary key,
  user_id text not null,
  slug text not null,
  tag text not null,
  unique(user_id, slug, tag)
);

-- Timeline entries
create table if not exists timeline_entries (
  id bigint generated always as identity primary key,
  user_id text not null,
  device_id text not null,
  slug text not null,
  entry_date text not null,
  content text not null,
  source text,
  created_at timestamptz not null default now()
);

-- Subscriptions (written by Stripe webhook via Vercel)
create table if not exists subscriptions (
  id bigint generated always as identity primary key,
  user_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  active boolean not null default false,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_pages_user_slug on pages(user_id, slug);
create index if not exists idx_pages_user_updated on pages(user_id, updated_at);
create index if not exists idx_tags_user_slug on tags(user_id, slug);
create index if not exists idx_timeline_user_date on timeline_entries(user_id, entry_date);
create index if not exists idx_subscriptions_user on subscriptions(user_id);

-- Row Level Security (RLS) — users can only access their own data
alter table pages enable row level security;
alter table tags enable row level security;
alter table timeline_entries enable row level security;
alter table subscriptions enable row level security;

create policy "Users can read own pages" on pages for select using (user_id = auth.uid()::text);
create policy "Users can write own pages" on pages for insert with check (user_id = auth.uid()::text);
create policy "Users can update own pages" on pages for update using (user_id = auth.uid()::text);
create policy "Users can delete own pages" on pages for delete using (user_id = auth.uid()::text);

create policy "Users can read own tags" on tags for select using (user_id = auth.uid()::text);
create policy "Users can write own tags" on tags for insert with check (user_id = auth.uid()::text);
create policy "Users can delete own tags" on tags for delete using (user_id = auth.uid()::text);

create policy "Users can read own timeline" on timeline_entries for select using (user_id = auth.uid()::text);
create policy "Users can write own timeline" on timeline_entries for insert with check (user_id = auth.uid()::text);

create policy "Users can read own subscription" on subscriptions for select using (user_id = auth.uid()::text);
