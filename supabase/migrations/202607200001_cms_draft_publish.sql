-- CMS draft/publish separation, campaigns, scraping candidates, publish history
-- Preserves existing live tables as the public (published) source of truth.
-- Admin edits land in draft tables until explicit publish.

-- ---------------------------------------------------------------------------
-- Publish status (shared)
-- ---------------------------------------------------------------------------
-- draft | pending_review | published | unpublished | expired

-- ---------------------------------------------------------------------------
-- services: CMS metadata + profile fields (nullable, non-breaking)
-- ---------------------------------------------------------------------------
alter table public.services
  add column if not exists company_name text;

alter table public.services
  add column if not exists service_start_year integer;

alter table public.services
  add column if not exists datacenter_location text;

alter table public.services
  add column if not exists editor_comment text;

alter table public.services
  add column if not exists overall_score numeric(4, 2);

alter table public.services
  add column if not exists suitable_beginner boolean;

alter table public.services
  add column if not exists suitable_blog boolean;

alter table public.services
  add column if not exists suitable_business boolean;

alter table public.services
  add column if not exists suitable_ec boolean;

alter table public.services
  add column if not exists adult_allowed boolean;

alter table public.services
  add column if not exists has_unpublished_changes boolean not null default false;

alter table public.services
  add column if not exists draft_updated_at timestamptz;

alter table public.services
  add column if not exists last_published_at timestamptz;

alter table public.services
  add column if not exists last_change_source text;

-- Expand status check if needed (keep existing values; add pending_review/expired via text)
do $$
begin
  alter table public.services drop constraint if exists services_status_check;
exception when undefined_object then null;
end $$;

alter table public.services
  drop constraint if exists services_status_check;

alter table public.services
  add constraint services_status_check
  check (status in ('draft', 'pending_review', 'published', 'unpublished', 'expired'));

-- ---------------------------------------------------------------------------
-- service_plans: plan-only fields + overrides
-- ---------------------------------------------------------------------------
alter table public.service_plans
  add column if not exists cpu text;

alter table public.service_plans
  add column if not exists memory text;

alter table public.service_plans
  add column if not exists transfer_amount text;

alter table public.service_plans
  add column if not exists free_trial_days integer;

alter table public.service_plans
  add column if not exists free_domain_count integer;

alter table public.service_plans
  add column if not exists multi_domain_count integer;

alter table public.service_plans
  add column if not exists database_count integer;

alter table public.service_plans
  add column if not exists payment_methods text;

alter table public.service_plans
  add column if not exists min_contract_period text;

alter table public.service_plans
  add column if not exists field_overrides jsonb not null default '{}'::jsonb;

alter table public.service_plans
  add column if not exists publish_status text not null default 'draft'
    check (publish_status in ('draft', 'pending_review', 'published', 'unpublished', 'expired'));

alter table public.service_plans
  add column if not exists has_unpublished_changes boolean not null default false;

-- ---------------------------------------------------------------------------
-- cms_service_drafts: working copy for admin (not read by public site)
-- ---------------------------------------------------------------------------
create table if not exists public.cms_service_drafts (
  service_id uuid primary key references public.services (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  published_snapshot jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'unpublished', 'expired')),
  change_count integer not null default 0,
  last_change_source text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists cms_service_drafts_set_updated_at on public.cms_service_drafts;
create trigger cms_service_drafts_set_updated_at
before update on public.cms_service_drafts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cms_change_items: selectable field-level pending changes
-- ---------------------------------------------------------------------------
create table if not exists public.cms_change_items (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in (
      'service', 'plan', 'campaign', 'comparison_field',
      'comparison_value', 'comparison_layout', 'seo'
    )),
  entity_id uuid,
  parent_service_id uuid references public.services (id) on delete cascade,
  parent_plan_id uuid references public.service_plans (id) on delete set null,
  field_key text not null,
  field_label text,
  old_value jsonb,
  new_value jsonb,
  change_source text not null default 'admin'
    check (change_source in ('scraping', 'google_sheets', 'admin', 'manual')),
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'discarded')),
  selected_for_publish boolean not null default true,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now(),
  published_at timestamptz,
  publish_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cms_change_items_service_status_idx
  on public.cms_change_items (parent_service_id, status);

create index if not exists cms_change_items_status_idx
  on public.cms_change_items (status)
  where status in ('draft', 'pending_review');

drop trigger if exists cms_change_items_set_updated_at on public.cms_change_items;
create trigger cms_change_items_set_updated_at
before update on public.cms_change_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cms_publish_events + history items
-- ---------------------------------------------------------------------------
create table if not exists public.cms_publish_events (
  id uuid primary key default gen_random_uuid(),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null,
  summary text,
  affected_pages text[] not null default '{}',
  change_count integer not null default 0,
  service_ids uuid[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.cms_change_items
  drop constraint if exists cms_change_items_publish_event_id_fkey;

alter table public.cms_change_items
  add constraint cms_change_items_publish_event_id_fkey
  foreign key (publish_event_id) references public.cms_publish_events (id) on delete set null;

create table if not exists public.cms_publish_history_items (
  id uuid primary key default gen_random_uuid(),
  publish_event_id uuid not null references public.cms_publish_events (id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  service_id uuid,
  plan_id uuid,
  field_key text not null,
  field_label text,
  old_value jsonb,
  new_value jsonb,
  change_source text,
  created_at timestamptz not null default now()
);

create index if not exists cms_publish_history_event_idx
  on public.cms_publish_history_items (publish_event_id);

create index if not exists cms_publish_events_published_at_idx
  on public.cms_publish_events (published_at desc);

-- ---------------------------------------------------------------------------
-- scraping_candidates (never auto-published)
-- ---------------------------------------------------------------------------
create table if not exists public.scraping_candidates (
  id uuid primary key default gen_random_uuid(),
  scraping_run_id uuid references public.scraping_runs (id) on delete set null,
  service_id uuid not null references public.services (id) on delete cascade,
  plan_id uuid references public.service_plans (id) on delete set null,
  field_key text not null,
  field_label text,
  current_published_value jsonb,
  current_draft_value jsonb,
  candidate_value jsonb,
  evidence text,
  source_url text,
  confidence numeric(5, 2),
  fetched_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'edited_accepted')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scraping_candidates_service_status_idx
  on public.scraping_candidates (service_id, status);

create index if not exists scraping_candidates_pending_idx
  on public.scraping_candidates (status)
  where status = 'pending';

drop trigger if exists scraping_candidates_set_updated_at on public.scraping_candidates;
create trigger scraping_candidates_set_updated_at
before update on public.scraping_candidates
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- service_campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.service_campaigns (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name text not null,
  summary text,
  target_plan_ids uuid[] not null default '{}',
  discount_rate numeric(6, 2),
  discount_amount numeric(12, 2),
  coupon_code text,
  cashback_note text,
  first_month_free boolean,
  ends_on date,
  source_url text,
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'pending_review', 'published', 'unpublished', 'expired')),
  is_published boolean not null default false,
  has_unpublished_changes boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_campaigns_service_idx
  on public.service_campaigns (service_id, display_order);

create index if not exists service_campaigns_published_idx
  on public.service_campaigns (service_id, is_published);

drop trigger if exists service_campaigns_set_updated_at on public.service_campaigns;
create trigger service_campaigns_set_updated_at
before update on public.service_campaigns
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- comparison_fields: draft flags (layout already has show_in_* columns)
-- ---------------------------------------------------------------------------
alter table public.comparison_fields
  add column if not exists publish_status text not null default 'published'
    check (publish_status in ('draft', 'pending_review', 'published', 'unpublished', 'expired'));

alter table public.comparison_fields
  add column if not exists has_unpublished_changes boolean not null default false;

alter table public.comparison_fields
  add column if not exists draft_show_in_top_featured boolean;

alter table public.comparison_fields
  add column if not exists draft_show_in_top_table boolean;

alter table public.comparison_fields
  add column if not exists draft_show_in_compare_page boolean;

-- ---------------------------------------------------------------------------
-- Seed comparison fields (idempotent) for all categories
-- ---------------------------------------------------------------------------
do $$
declare
  cat record;
begin
  for cat in select id from public.categories
  loop
    -- 料金
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, publish_status, value_source, compare_rule,
      show_in_top_featured, top_featured_display_order,
      show_in_top_table, top_table_display_order,
      show_in_compare_page, compare_page_display_order
    ) values
      (cat.id, '月額料金', 'monthly-price', 'number', '料金', 10, true, 'published', 'plan_monthly_price', 'min', true, 1, true, 1, true, 1),
      (cat.id, '初期費用', 'initial-fee', 'number', '料金', 20, true, 'published', 'plan_initial_fee', 'min', true, 2, true, 2, true, 2),
      (cat.id, '無料お試し', 'free-trial-days', 'number', '料金', 30, true, 'published', 'comparison_value', 'max', true, 3, true, 3, true, 3),
      (cat.id, 'キャンペーン', 'campaign', 'text', '料金', 40, true, 'published', 'comparison_value', null, true, 4, true, 4, true, 4)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      is_published = true,
      publish_status = 'published';

    -- 容量
    insert into public.comparison_fields (
      category_id, name, slug, field_type, unit, display_group, display_order,
      is_published, publish_status, value_source, compare_rule,
      show_in_top_featured, show_in_top_table, show_in_compare_page
    ) values
      (cat.id, '容量', 'storage', 'number', 'GB', '容量', 50, true, 'published', 'plan_storage', 'max', true, true, true),
      (cat.id, 'ストレージ種類', 'storage-type', 'text', null, '容量', 60, true, 'published', 'comparison_value', null, false, true, true)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      is_published = true;

    -- WordPress
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, publish_status, value_source,
      show_in_top_featured, show_in_top_table, show_in_compare_page
    ) values
      (cat.id, '簡単インストール', 'wp-easy-install', 'boolean', 'WordPress', 70, true, 'published', 'comparison_value', false, true, true),
      (cat.id, '簡単移行', 'wp-easy-migrate', 'boolean', 'WordPress', 80, true, 'published', 'comparison_value', false, true, true),
      (cat.id, '自動更新', 'wp-auto-update', 'boolean', 'WordPress', 90, true, 'published', 'comparison_value', false, false, true),
      (cat.id, 'ステージング', 'wp-staging', 'boolean', 'WordPress', 100, true, 'published', 'comparison_value', false, false, true),
      (cat.id, '無料テーマ', 'wp-free-theme', 'boolean', 'WordPress', 110, true, 'published', 'comparison_value', false, false, true),
      (cat.id, '初期設定代行', 'wp-setup-support', 'boolean', 'WordPress', 120, true, 'published', 'comparison_value', false, false, true)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      is_published = true;

    -- サポート
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, publish_status, value_source,
      show_in_top_featured, show_in_top_table, show_in_compare_page
    ) values
      (cat.id, '電話', 'support-phone', 'boolean', 'サポート', 130, true, 'published', 'comparison_value', true, true, true),
      (cat.id, 'メール', 'support-email', 'boolean', 'サポート', 140, true, 'published', 'comparison_value', false, true, true),
      (cat.id, 'チャット', 'support-chat', 'boolean', 'サポート', 150, true, 'published', 'comparison_value', false, true, true),
      (cat.id, '24時間対応', 'support-24h', 'boolean', 'サポート', 160, true, 'published', 'comparison_value', false, false, true),
      (cat.id, '土日対応', 'support-weekend', 'boolean', 'サポート', 170, true, 'published', 'comparison_value', false, false, true),
      (cat.id, '営業時間', 'support-hours', 'text', 'サポート', 180, true, 'published', 'comparison_value', false, false, true),
      (cat.id, 'サポート備考', 'support-notes', 'text', 'サポート', 190, true, 'published', 'comparison_value', false, false, true)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      is_published = true;

    -- ドメイン
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, publish_status, value_source,
      show_in_top_featured, show_in_top_table, show_in_compare_page
    ) values
      (cat.id, '無料ドメイン', 'free-domain', 'number', 'ドメイン', 200, true, 'published', 'comparison_value', false, true, true)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      is_published = true;

    -- バックアップ
    insert into public.comparison_fields (
      category_id, name, slug, field_type, unit, display_group, display_order,
      is_published, publish_status, value_source,
      show_in_top_featured, show_in_top_table, show_in_compare_page
    ) values
      (cat.id, '自動バックアップ', 'auto-backup', 'boolean', null, 'バックアップ', 210, true, 'published', 'comparison_value', false, true, true),
      (cat.id, '保存期間', 'backup-retention-days', 'number', '日', 'バックアップ', 220, true, 'published', 'comparison_value', false, true, true)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      is_published = true;

    -- セキュリティ
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, publish_status, value_source,
      show_in_top_featured, show_in_top_table, show_in_compare_page
    ) values
      (cat.id, '無料SSL', 'free-ssl', 'boolean', 'セキュリティ', 230, true, 'published', 'comparison_value', false, true, true),
      (cat.id, 'WAF', 'waf', 'boolean', 'セキュリティ', 240, true, 'published', 'comparison_value', false, true, true),
      (cat.id, 'DDoS', 'ddos', 'boolean', 'セキュリティ', 250, true, 'published', 'comparison_value', false, false, true),
      (cat.id, 'ウイルス対策', 'antivirus', 'boolean', 'セキュリティ', 260, true, 'published', 'comparison_value', false, false, true),
      (cat.id, '迷惑メール対策', 'anti-spam', 'boolean', 'セキュリティ', 270, true, 'published', 'comparison_value', false, false, true)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      is_published = true;

    -- 性能
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, publish_status, value_source,
      show_in_top_featured, show_in_top_table, show_in_compare_page
    ) values
      (cat.id, 'CPU', 'cpu', 'text', '性能', 280, true, 'published', 'comparison_value', false, true, true),
      (cat.id, 'メモリ', 'memory', 'text', '性能', 290, true, 'published', 'comparison_value', false, true, true),
      (cat.id, '転送量', 'transfer', 'text', '性能', 300, true, 'published', 'comparison_value', false, true, true),
      (cat.id, 'NVMe SSD', 'nvme-ssd', 'boolean', '性能', 310, true, 'published', 'comparison_value', false, true, true),
      (cat.id, 'LiteSpeed', 'litespeed', 'boolean', '性能', 320, true, 'published', 'comparison_value', false, true, true),
      (cat.id, 'HTTP/3', 'http3', 'boolean', '性能', 330, true, 'published', 'comparison_value', false, true, true),
      (cat.id, 'HTTP/2', 'http2', 'boolean', '性能', 340, true, 'published', 'comparison_value', false, false, true),
      (cat.id, 'CDN', 'cdn', 'boolean', '性能', 350, true, 'published', 'comparison_value', false, false, true)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      is_published = true;

    -- 会社情報（比較ページのみ）
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, publish_status, value_source,
      show_in_top_featured, show_in_top_table, show_in_compare_page
    ) values
      (cat.id, 'データセンター所在地', 'datacenter-location', 'text', '会社情報', 360, true, 'published', 'comparison_value', false, false, true),
      (cat.id, 'サービス開始年', 'service-start-year', 'number', '会社情報', 370, true, 'published', 'comparison_value', false, false, true),
      (cat.id, '運営会社', 'company-name', 'text', '会社情報', 380, true, 'published', 'comparison_value', false, false, true)
    on conflict (category_id, slug) do update set
      display_group = excluded.display_group,
      show_in_compare_page = true,
      is_published = true;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Backfill drafts from current live rows (published_snapshot = current state)
-- ---------------------------------------------------------------------------
insert into public.cms_service_drafts (service_id, payload, published_snapshot, status, change_count)
select
  s.id,
  jsonb_build_object(
    'service', to_jsonb(s),
    'plans', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.display_order)
      from public.service_plans p where p.service_id = s.id
    ), '[]'::jsonb),
    'comparison_values', coalesce((
      select jsonb_agg(to_jsonb(v))
      from public.comparison_values v where v.service_id = s.id
    ), '[]'::jsonb),
    'campaigns', '[]'::jsonb
  ),
  case when s.is_published then
    jsonb_build_object(
      'service', to_jsonb(s),
      'plans', coalesce((
        select jsonb_agg(to_jsonb(p) order by p.display_order)
        from public.service_plans p where p.service_id = s.id
      ), '[]'::jsonb),
      'comparison_values', coalesce((
        select jsonb_agg(to_jsonb(v))
        from public.comparison_values v where v.service_id = s.id
      ), '[]'::jsonb),
      'campaigns', '[]'::jsonb
    )
  else null end,
  case
    when s.status = 'published' then 'published'
    when s.status = 'unpublished' then 'unpublished'
    else 'draft'
  end,
  0
from public.services s
on conflict (service_id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.cms_service_drafts enable row level security;
alter table public.cms_change_items enable row level security;
alter table public.cms_publish_events enable row level security;
alter table public.cms_publish_history_items enable row level security;
alter table public.scraping_candidates enable row level security;
alter table public.service_campaigns enable row level security;

-- Drafts / candidates / history: admin only (never public)
drop policy if exists cms_service_drafts_admin_all on public.cms_service_drafts;
create policy cms_service_drafts_admin_all
  on public.cms_service_drafts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists cms_change_items_admin_all on public.cms_change_items;
create policy cms_change_items_admin_all
  on public.cms_change_items for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists cms_publish_events_admin_all on public.cms_publish_events;
create policy cms_publish_events_admin_all
  on public.cms_publish_events for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists cms_publish_history_admin_all on public.cms_publish_history_items;
create policy cms_publish_history_admin_all
  on public.cms_publish_history_items for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists scraping_candidates_admin_all on public.scraping_candidates;
create policy scraping_candidates_admin_all
  on public.scraping_candidates for all
  using (public.is_admin())
  with check (public.is_admin());

-- Campaigns: public read only when published
drop policy if exists service_campaigns_public_read on public.service_campaigns;
create policy service_campaigns_public_read
  on public.service_campaigns for select
  using (
    public.is_admin()
    or (is_published = true and publish_status = 'published')
  );

drop policy if exists service_campaigns_admin_all on public.service_campaigns;
create policy service_campaigns_admin_all
  on public.service_campaigns for all
  using (public.is_admin())
  with check (public.is_admin());
