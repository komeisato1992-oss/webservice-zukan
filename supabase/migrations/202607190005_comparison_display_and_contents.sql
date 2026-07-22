-- Comparison field display placement (TOP featured / TOP table / compare page)
-- + managed_contents for notices / campaigns / AI article candidates / features
-- Auth: anon key + RLS + Supabase Auth（service_role 不使用）

-- ---------------------------------------------------------------------------
-- comparison_fields: display placement + value source + compare rule
-- ---------------------------------------------------------------------------
alter table public.comparison_fields
  add column if not exists value_source text not null default 'comparison_value'
    check (value_source in (
      'comparison_value',
      'plan_monthly_price',
      'plan_initial_fee',
      'plan_storage'
    ));

alter table public.comparison_fields
  add column if not exists compare_rule text
    check (compare_rule is null or compare_rule in ('min', 'max', 'true', 'score'));

alter table public.comparison_fields
  add column if not exists show_in_top_featured boolean not null default false;

alter table public.comparison_fields
  add column if not exists top_featured_display_order integer;

alter table public.comparison_fields
  add column if not exists show_in_top_table boolean not null default false;

alter table public.comparison_fields
  add column if not exists top_table_display_order integer;

alter table public.comparison_fields
  add column if not exists show_in_compare_page boolean not null default true;

alter table public.comparison_fields
  add column if not exists compare_page_display_order integer;

create index if not exists comparison_fields_top_featured_idx
  on public.comparison_fields (category_id, show_in_top_featured, top_featured_display_order)
  where show_in_top_featured = true;

create index if not exists comparison_fields_top_table_idx
  on public.comparison_fields (category_id, show_in_top_table, top_table_display_order)
  where show_in_top_table = true;

create index if not exists comparison_fields_compare_page_idx
  on public.comparison_fields (category_id, show_in_compare_page, compare_page_display_order)
  where show_in_compare_page = true;

-- Seed plan-backed / trial / support fields per published category (idempotent)
do $$
declare
  cat record;
begin
  for cat in
    select id from public.categories
  loop
    -- 初期費用
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, value_source, compare_rule,
      show_in_top_featured, top_featured_display_order,
      show_in_top_table, top_table_display_order,
      show_in_compare_page, compare_page_display_order
    )
    values (
      cat.id, '初期費用', 'initial-fee', 'number', '料金', 10,
      true, 'plan_initial_fee', 'min',
      true, 1,
      true, 1,
      true, 1
    )
    on conflict (category_id, slug) do update set
      value_source = excluded.value_source,
      compare_rule = coalesce(public.comparison_fields.compare_rule, excluded.compare_rule),
      show_in_top_featured = true,
      top_featured_display_order = coalesce(public.comparison_fields.top_featured_display_order, 1),
      is_published = true;

    -- 月額料金
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, value_source, compare_rule,
      show_in_top_featured, top_featured_display_order,
      show_in_top_table, top_table_display_order,
      show_in_compare_page, compare_page_display_order
    )
    values (
      cat.id, '月額料金', 'monthly-price', 'number', '料金', 20,
      true, 'plan_monthly_price', 'min',
      true, 2,
      true, 2,
      true, 2
    )
    on conflict (category_id, slug) do update set
      value_source = excluded.value_source,
      compare_rule = coalesce(public.comparison_fields.compare_rule, excluded.compare_rule),
      show_in_top_featured = true,
      top_featured_display_order = coalesce(public.comparison_fields.top_featured_display_order, 2),
      is_published = true;

    -- 無料お試し期間
    insert into public.comparison_fields (
      category_id, name, slug, field_type, unit, display_group, display_order,
      is_published, value_source, compare_rule,
      show_in_top_featured, top_featured_display_order,
      show_in_top_table, top_table_display_order,
      show_in_compare_page, compare_page_display_order
    )
    values (
      cat.id, '無料お試し期間', 'free-trial-days', 'number', '日', '料金', 30,
      true, 'comparison_value', 'max',
      true, 3,
      true, 3,
      true, 3
    )
    on conflict (category_id, slug) do update set
      name = excluded.name,
      compare_rule = coalesce(public.comparison_fields.compare_rule, excluded.compare_rule),
      show_in_top_featured = true,
      top_featured_display_order = coalesce(public.comparison_fields.top_featured_display_order, 3),
      is_published = true;

    -- 容量
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, value_source, compare_rule,
      show_in_top_featured, top_featured_display_order,
      show_in_top_table, top_table_display_order,
      show_in_compare_page, compare_page_display_order
    )
    values (
      cat.id, '容量', 'storage', 'number', '容量・性能', 40,
      true, 'plan_storage', 'max',
      true, 4,
      true, 4,
      true, 4
    )
    on conflict (category_id, slug) do update set
      value_source = excluded.value_source,
      compare_rule = coalesce(public.comparison_fields.compare_rule, excluded.compare_rule),
      show_in_top_featured = true,
      top_featured_display_order = coalesce(public.comparison_fields.top_featured_display_order, 4),
      is_published = true;

    -- サポート（既存 slug=support があれば再利用）
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, value_source, compare_rule,
      show_in_top_featured, top_featured_display_order,
      show_in_top_table, top_table_display_order,
      show_in_compare_page, compare_page_display_order
    )
    values (
      cat.id, 'サポート', 'support', 'text', 'サポート', 50,
      true, 'comparison_value', 'score',
      true, 5,
      true, 5,
      true, 5
    )
    on conflict (category_id, slug) do update set
      show_in_top_featured = true,
      top_featured_display_order = coalesce(public.comparison_fields.top_featured_display_order, 5),
      compare_rule = coalesce(public.comparison_fields.compare_rule, 'score'),
      is_published = true;
  end loop;
end $$;

-- Ensure exactly the default 5 featured flags when none were configured before
-- (do not wipe admin customizations if more than 0 featured already existed with custom set)
-- Already handled by upserts above for the 5 seed slugs.

-- ---------------------------------------------------------------------------
-- managed_contents
-- ---------------------------------------------------------------------------
create table if not exists public.managed_contents (
  id uuid primary key default gen_random_uuid(),
  content_type text not null
    check (content_type in ('ai_article', 'notice', 'campaign', 'feature')),
  title text not null,
  summary text,
  body text,
  service_id uuid references public.services (id) on delete set null,
  source_url text,
  source_type text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'published', 'expired', 'rejected')),
  is_checked boolean not null default false,
  priority integer,
  published_at timestamptz,
  expires_at timestamptz,
  scraping_run_id uuid references public.scraping_runs (id) on delete set null,
  ai_generated boolean not null default false,
  deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists managed_contents_public_list_idx
  on public.managed_contents (status, is_checked, priority, published_at desc)
  where deleted_at is null;

create index if not exists managed_contents_type_idx
  on public.managed_contents (content_type)
  where deleted_at is null;

create index if not exists managed_contents_service_idx
  on public.managed_contents (service_id)
  where deleted_at is null;

create trigger managed_contents_set_updated_at
before update on public.managed_contents
for each row execute function public.set_updated_at();

alter table public.managed_contents enable row level security;

-- Public: published + checked + in window + not deleted
drop policy if exists managed_contents_public_read on public.managed_contents;
create policy managed_contents_public_read
  on public.managed_contents for select
  using (
    public.is_admin()
    or (
      deleted_at is null
      and is_checked = true
      and status = 'published'
      and priority is not null
      and (published_at is null or published_at <= now())
      and (expires_at is null or expires_at > now())
    )
  );

drop policy if exists managed_contents_admin_insert on public.managed_contents;
create policy managed_contents_admin_insert
  on public.managed_contents for insert
  with check (public.is_admin());

drop policy if exists managed_contents_admin_update on public.managed_contents;
create policy managed_contents_admin_update
  on public.managed_contents for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists managed_contents_admin_delete on public.managed_contents;
create policy managed_contents_admin_delete
  on public.managed_contents for delete
  using (public.is_admin());
