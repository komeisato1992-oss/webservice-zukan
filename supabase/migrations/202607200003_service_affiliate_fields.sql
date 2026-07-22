-- Affiliate URL management on services (hand-managed; never overwritten by scraping)
alter table public.services
  add column if not exists affiliate_url text,
  add column if not exists affiliate_network text default 'A8',
  add column if not exists affiliate_status text default 'inactive';

update public.services
set affiliate_network = coalesce(nullif(trim(affiliate_network), ''), 'A8')
where affiliate_network is null or trim(affiliate_network) = '';

update public.services
set affiliate_status = coalesce(nullif(trim(affiliate_status), ''), 'inactive')
where affiliate_status is null or trim(affiliate_status) = '';

alter table public.services
  alter column affiliate_network set default 'A8',
  alter column affiliate_status set default 'inactive';

comment on column public.services.affiliate_url is
  'アフィリエイトURL。設定時は本番の公式サイトボタンで official_url より優先';
comment on column public.services.affiliate_network is
  'ASP名（A8 / もしも / バリューコマース / afb / アクセストレード / その他）';
comment on column public.services.affiliate_status is
  '提携状況: active=提携済 / pending=申請中 / inactive=未提携';
