-- Phase 2a: service_plans / comparison_fields / comparison_values
-- Auth: anon key + RLS + Supabase Auth（service_role 不使用）

-- ---------------------------------------------------------------------------
-- service_plans
-- ---------------------------------------------------------------------------
create table if not exists public.service_plans (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name text not null,
  slug text not null,
  regular_monthly_price numeric(12, 2),
  campaign_monthly_price numeric(12, 2),
  effective_monthly_price numeric(12, 2),
  initial_fee numeric(12, 2),
  billing_period text,
  storage_value numeric(14, 2),
  storage_unit text,
  description text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_plans_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint service_plans_service_slug_unique unique (service_id, slug)
);

create index if not exists service_plans_service_order_idx
  on public.service_plans (service_id, display_order);

create index if not exists service_plans_published_idx
  on public.service_plans (service_id, is_published);

create trigger service_plans_set_updated_at
before update on public.service_plans
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- comparison_fields（カテゴリ単位）
-- options: select 用の選択肢（カンマ区切り）。基本カラム外だが select 運用に必要
-- ---------------------------------------------------------------------------
create table if not exists public.comparison_fields (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  slug text not null,
  field_type text not null
    check (field_type in ('boolean', 'number', 'text', 'select', 'rating')),
  unit text,
  options text,
  description text,
  display_order integer not null default 0,
  is_filterable boolean not null default false,
  is_highlighted boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comparison_fields_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint comparison_fields_category_slug_unique unique (category_id, slug)
);

create index if not exists comparison_fields_category_order_idx
  on public.comparison_fields (category_id, display_order);

create index if not exists comparison_fields_published_idx
  on public.comparison_fields (category_id, is_published);

create trigger comparison_fields_set_updated_at
before update on public.comparison_fields
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- comparison_values（サービス単位 or プラン単位）
-- ---------------------------------------------------------------------------
create table if not exists public.comparison_values (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  plan_id uuid references public.service_plans (id) on delete cascade,
  comparison_field_id uuid not null references public.comparison_fields (id) on delete cascade,
  boolean_value boolean,
  number_value numeric(14, 4),
  text_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comparison_values_service_idx
  on public.comparison_values (service_id);

create index if not exists comparison_values_field_idx
  on public.comparison_values (comparison_field_id);

create index if not exists comparison_values_plan_idx
  on public.comparison_values (plan_id);

-- 同一サービス・プラン・比較項目の重複防止（plan_id NULL = サービス単位）
create unique index if not exists comparison_values_unique_idx
  on public.comparison_values (
    service_id,
    comparison_field_id,
    coalesce(plan_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create trigger comparison_values_set_updated_at
before update on public.comparison_values
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.service_plans enable row level security;
alter table public.comparison_fields enable row level security;
alter table public.comparison_values enable row level security;

-- service_plans: 公開プランは誰でも読める / 管理者は全操作
create policy service_plans_public_read
  on public.service_plans for select
  using (
    public.is_admin()
    or (
      is_published = true
      and exists (
        select 1
        from public.services s
        where s.id = service_plans.service_id
          and s.is_published = true
      )
    )
  );

create policy service_plans_admin_insert
  on public.service_plans for insert
  with check (public.is_admin());

create policy service_plans_admin_update
  on public.service_plans for update
  using (public.is_admin())
  with check (public.is_admin());

create policy service_plans_admin_delete
  on public.service_plans for delete
  using (public.is_admin());

-- comparison_fields: 公開項目は誰でも読める / 管理者は全操作
create policy comparison_fields_public_read
  on public.comparison_fields for select
  using (is_published = true or public.is_admin());

create policy comparison_fields_admin_insert
  on public.comparison_fields for insert
  with check (public.is_admin());

create policy comparison_fields_admin_update
  on public.comparison_fields for update
  using (public.is_admin())
  with check (public.is_admin());

create policy comparison_fields_admin_delete
  on public.comparison_fields for delete
  using (public.is_admin());

-- comparison_values: 公開サービスに紐づく値は読める / 管理者は全操作
create policy comparison_values_public_read
  on public.comparison_values for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.services s
      where s.id = comparison_values.service_id
        and s.is_published = true
    )
  );

create policy comparison_values_admin_insert
  on public.comparison_values for insert
  with check (public.is_admin());

create policy comparison_values_admin_update
  on public.comparison_values for update
  using (public.is_admin())
  with check (public.is_admin());

create policy comparison_values_admin_delete
  on public.comparison_values for delete
  using (public.is_admin());
