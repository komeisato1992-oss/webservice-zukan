-- Domain dictionary: domain_service_details (1 service = 1 row)

-- ---------------------------------------------------------------------------
-- category seed for domain services (category_id is required on services)
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, description, display_order, is_published, seo_title, seo_description)
values (
  'ドメイン',
  'domain',
  'ドメイン取得・管理サービス',
  2,
  false,
  'ドメイン比較｜Webサービス図鑑',
  'ドメイン取得サービスを料金・機能で比較できます。'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- domain_service_details
-- ---------------------------------------------------------------------------
create table if not exists public.domain_service_details (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references public.services (id) on delete cascade,

  -- pricing (.com / .jp / .co.jp / .net) — null = 未確認, 0 = 0円
  com_registration_price numeric(12, 2),
  com_renewal_price numeric(12, 2),
  com_transfer_price numeric(12, 2),
  jp_registration_price numeric(12, 2),
  jp_renewal_price numeric(12, 2),
  jp_transfer_price numeric(12, 2),
  co_jp_registration_price numeric(12, 2),
  co_jp_renewal_price numeric(12, 2),
  co_jp_transfer_price numeric(12, 2),
  net_registration_price numeric(12, 2),
  net_renewal_price numeric(12, 2),
  net_transfer_price numeric(12, 2),
  initial_fee numeric(12, 2),
  campaign_price_note text,
  price_note text,

  -- features / support: supported | unsupported | null(未確認)
  whois_privacy_status text
    check (whois_privacy_status is null or whois_privacy_status in ('supported', 'unsupported')),
  whois_privacy_price numeric(12, 2),
  dns_status text
    check (dns_status is null or dns_status in ('supported', 'unsupported')),
  dnssec_status text
    check (dnssec_status is null or dnssec_status in ('supported', 'unsupported')),
  auto_renewal_status text
    check (auto_renewal_status is null or auto_renewal_status in ('supported', 'unsupported')),
  transfer_status text
    check (transfer_status is null or transfer_status in ('supported', 'unsupported')),
  japanese_domain_status text
    check (japanese_domain_status is null or japanese_domain_status in ('supported', 'unsupported')),
  phone_support_status text
    check (phone_support_status is null or phone_support_status in ('supported', 'unsupported')),
  email_support_status text
    check (email_support_status is null or email_support_status in ('supported', 'unsupported')),
  chat_support_status text
    check (chat_support_status is null or chat_support_status in ('supported', 'unsupported')),
  server_bundle_benefit text
    check (server_bundle_benefit is null or server_bundle_benefit in ('supported', 'unsupported')),
  free_domain_benefit text
    check (free_domain_benefit is null or free_domain_benefit in ('supported', 'unsupported')),
  feature_note text,

  -- basic extras
  merits text,
  demerits text,

  -- single campaign
  campaign_name text,
  campaign_description text,
  campaign_end_date date,
  campaign_url text,
  campaign_is_active boolean not null default false,

  -- SEO extras
  intro_text text,
  outro_text text,
  faq jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists domain_service_details_service_id_idx
  on public.domain_service_details (service_id);

create trigger domain_service_details_set_updated_at
before update on public.domain_service_details
for each row execute function public.set_updated_at();

alter table public.domain_service_details enable row level security;

drop policy if exists domain_service_details_public_read on public.domain_service_details;
create policy domain_service_details_public_read
  on public.domain_service_details for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.services s
      where s.id = domain_service_details.service_id
        and s.is_published = true
    )
  );

drop policy if exists domain_service_details_admin_insert on public.domain_service_details;
create policy domain_service_details_admin_insert
  on public.domain_service_details for insert
  with check (public.is_admin());

drop policy if exists domain_service_details_admin_update on public.domain_service_details;
create policy domain_service_details_admin_update
  on public.domain_service_details for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists domain_service_details_admin_delete on public.domain_service_details;
create policy domain_service_details_admin_delete
  on public.domain_service_details for delete
  using (public.is_admin());
