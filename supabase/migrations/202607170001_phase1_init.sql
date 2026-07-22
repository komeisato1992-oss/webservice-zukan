-- Phase 1: categories / services / affiliate_links / admin_users
-- Auth: anon key + RLS + Supabase Auth（service_role 不使用）

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_users（Supabase Auth と連携）
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- is_admin(): RLS 用（SECURITY DEFINER）
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
      and is_active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists categories_published_order_idx
  on public.categories (is_published, display_order);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  slug text not null,
  short_name text,
  catchphrase text,
  summary text,
  description text,
  logo_url text,
  thumbnail_url text,
  official_url text,
  primary_link_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'unpublished')),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  editor_score numeric(3, 1)
    check (editor_score is null or (editor_score >= 0 and editor_score <= 10)),
  recommended_uses text,
  seo_title text,
  seo_description text,
  canonical_url text,
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint services_category_slug_unique unique (category_id, slug)
);

create index if not exists services_category_published_idx
  on public.services (category_id, is_published, display_order);

create index if not exists services_updated_at_idx
  on public.services (updated_at desc);

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

-- status と is_published を同期
create or replace function public.sync_service_publish_flags()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' then
    new.is_published := true;
  else
    new.is_published := false;
  end if;
  return new;
end;
$$;

create trigger services_sync_publish_flags
before insert or update of status on public.services
for each row execute function public.sync_service_publish_flags();

-- ---------------------------------------------------------------------------
-- affiliate_links
-- ---------------------------------------------------------------------------
create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  asp_name text,
  program_name text,
  official_url text,
  affiliate_url text,
  approval_status text not null default 'not_applied'
    check (approval_status in ('not_applied', 'pending', 'approved', 'rejected', 'closed')),
  reward_note text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_links_service_idx
  on public.affiliate_links (service_id);

create index if not exists affiliate_links_primary_active_idx
  on public.affiliate_links (service_id, is_primary, is_active);

create trigger affiliate_links_set_updated_at
before update on public.affiliate_links
for each row execute function public.set_updated_at();

-- サービスごとに primary は1件まで（is_primary = true のとき）
create unique index if not exists affiliate_links_one_primary_per_service
  on public.affiliate_links (service_id)
  where is_primary = true;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.services enable row level security;
alter table public.affiliate_links enable row level security;

-- admin_users
create policy admin_users_select_self_or_admin
  on public.admin_users for select
  using (id = auth.uid() or public.is_admin());

create policy admin_users_update_admin
  on public.admin_users for update
  using (public.is_admin())
  with check (public.is_admin());

-- categories: 公開は誰でも読める / 管理者は全操作
create policy categories_public_read
  on public.categories for select
  using (is_published = true or public.is_admin());

create policy categories_admin_insert
  on public.categories for insert
  with check (public.is_admin());

create policy categories_admin_update
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

create policy categories_admin_delete
  on public.categories for delete
  using (public.is_admin());

-- services
create policy services_public_read
  on public.services for select
  using (is_published = true or public.is_admin());

create policy services_admin_insert
  on public.services for insert
  with check (public.is_admin());

create policy services_admin_update
  on public.services for update
  using (public.is_admin())
  with check (public.is_admin());

create policy services_admin_delete
  on public.services for delete
  using (public.is_admin());

-- affiliate_links: 公開サービスに紐づく有効リンクは読める / 管理者は全操作
create policy affiliate_links_public_read
  on public.affiliate_links for select
  using (
    public.is_admin()
    or (
      is_active = true
      and exists (
        select 1
        from public.services s
        where s.id = affiliate_links.service_id
          and s.is_published = true
      )
    )
  );

create policy affiliate_links_admin_insert
  on public.affiliate_links for insert
  with check (public.is_admin());

create policy affiliate_links_admin_update
  on public.affiliate_links for update
  using (public.is_admin())
  with check (public.is_admin());

create policy affiliate_links_admin_delete
  on public.affiliate_links for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 初期カテゴリ
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, description, display_order, is_published, seo_title, seo_description)
values (
  'サーバー',
  'server',
  'レンタルサーバー・ホスティングサービスを比較できます。',
  1,
  true,
  'レンタルサーバー比較｜Webサービス図鑑',
  'レンタルサーバーを料金・容量・機能で比較できる総合ガイドです。'
)
on conflict (slug) do nothing;
