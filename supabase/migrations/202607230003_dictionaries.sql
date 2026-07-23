-- Phase1 CMS: 図鑑マスタ (dictionaries) + services.dictionary_id

-- ---------------------------------------------------------------------------
-- dictionaries
-- ---------------------------------------------------------------------------
create table if not exists public.dictionaries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text,
  icon text,
  description text,
  is_public boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dictionaries_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists dictionaries_public_order_idx
  on public.dictionaries (is_public, sort_order);

create trigger dictionaries_set_updated_at
before update on public.dictionaries
for each row execute function public.set_updated_at();

alter table public.dictionaries enable row level security;

drop policy if exists dictionaries_public_read on public.dictionaries;
create policy dictionaries_public_read
  on public.dictionaries for select
  using (is_public = true or public.is_admin());

drop policy if exists dictionaries_admin_insert on public.dictionaries;
create policy dictionaries_admin_insert
  on public.dictionaries for insert
  with check (public.is_admin());

drop policy if exists dictionaries_admin_update on public.dictionaries;
create policy dictionaries_admin_update
  on public.dictionaries for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists dictionaries_admin_delete on public.dictionaries;
create policy dictionaries_admin_delete
  on public.dictionaries for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- seed dictionaries
-- ---------------------------------------------------------------------------
insert into public.dictionaries (name, slug, description, is_public, sort_order, color, icon)
values
  (
    'サーバー図鑑',
    'server',
    'レンタルサーバー・ホスティングサービスを比較できる図鑑です。',
    true,
    1,
    '#2563eb',
    null
  ),
  (
    'ドメイン図鑑',
    'domain',
    'ドメイン取得・管理サービスを比較できる図鑑です（準備中）。',
    false,
    2,
    '#0f766e',
    null
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_public = excluded.is_public,
  sort_order = excluded.sort_order,
  color = coalesce(public.dictionaries.color, excluded.color),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- services.dictionary_id
-- ---------------------------------------------------------------------------
alter table public.services
  add column if not exists dictionary_id uuid references public.dictionaries (id) on delete restrict;

-- 既存サービスをサーバー図鑑へ紐付け（未紐付けのみ）
update public.services s
set dictionary_id = d.id
from public.dictionaries d
where d.slug = 'server'
  and s.dictionary_id is null;

-- 未紐付けが残らないように NOT NULL 化
do $$
begin
  if exists (
    select 1 from public.services where dictionary_id is null
  ) then
    raise exception 'services.dictionary_id backfill failed: null rows remain';
  end if;
end $$;

alter table public.services
  alter column dictionary_id set not null;

create index if not exists services_dictionary_published_idx
  on public.services (dictionary_id, is_published, display_order);
