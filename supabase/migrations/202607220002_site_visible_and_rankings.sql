-- 本サイト表示フラグ + ランキング管理（ドラフト／公開）

alter table public.services
  add column if not exists is_site_visible boolean not null default true;

comment on column public.services.is_site_visible is
  'false のとき本サイト全体から非表示（管理画面・DBには残す）';

-- 指定4サービスを本サイト非表示（物理削除しない）
update public.services
set is_site_visible = false
where slug in ('webarena-indigo', 'heteml', 'futoka', 'zenlogic');

create table if not exists public.ranking_entries (
  id uuid primary key default gen_random_uuid(),
  purpose_id text not null,
  rank smallint not null check (rank between 1 and 3),
  service_id uuid references public.services (id) on delete set null,
  plan_id uuid references public.service_plans (id) on delete set null,
  card_comment text,
  sub_comment text,
  is_visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ranking_entries_purpose_rank_unique unique (purpose_id, rank)
);

create index if not exists ranking_entries_purpose_idx
  on public.ranking_entries (purpose_id);

create table if not exists public.cms_ranking_drafts (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{"entries":[]}'::jsonb,
  published_snapshot jsonb,
  status text not null default 'draft',
  change_count integer not null default 0,
  last_change_source text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- シングルトン行を保証（常に1件）
create unique index if not exists cms_ranking_drafts_singleton
  on public.cms_ranking_drafts ((true));

create table if not exists public.ranking_publish_history (
  id uuid primary key default gen_random_uuid(),
  purpose_id text not null,
  rank smallint not null,
  service_id uuid,
  service_name text,
  plan_id uuid,
  plan_name text,
  card_comment text,
  sub_comment text,
  old_value jsonb,
  new_value jsonb,
  published_at timestamptz not null default now(),
  published_by uuid
);

create index if not exists ranking_publish_history_published_at_idx
  on public.ranking_publish_history (published_at desc);

-- RLS（ポリシー本体は 202607220003_ranking_rls.sql でも再適用可）
alter table public.ranking_entries enable row level security;
alter table public.cms_ranking_drafts enable row level security;
alter table public.ranking_publish_history enable row level security;
