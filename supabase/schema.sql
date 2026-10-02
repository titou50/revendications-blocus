create extension if not exists "pgcrypto";

create type claim_category as enum ('local', 'national');
create type claim_status as enum ('active', 'flagged', 'archived');
create type vote_type as enum ('against', 'low_priority', 'off_topic');

create table if not exists establishments (
  id uuid primary key default gen_random_uuid(),
  code_uai varchar unique not null,
  name varchar not null,
  city varchar not null,
  type varchar not null,
  participant_count int not null default 0
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  category claim_category not null,
  original_text text not null,
  formatted_title text not null,
  created_at timestamptz not null default now(),
  votes_against int not null default 0,
  votes_low_priority int not null default 0,
  votes_off_topic int not null default 0,
  status claim_status not null default 'active'
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  user_session_id varchar not null,
  vote_type vote_type not null,
  created_at timestamptz not null default now(),
  unique (claim_id, user_session_id)
);

create table if not exists visits (
  establishment_id uuid not null references establishments(id) on delete cascade,
  user_session_id varchar not null,
  created_at timestamptz not null default now(),
  primary key (establishment_id, user_session_id)
);

alter table establishments enable row level security;
alter table claims enable row level security;
alter table votes enable row level security;
alter table visits enable row level security;
