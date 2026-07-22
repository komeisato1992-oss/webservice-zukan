-- 比較表の代表プラン・推奨フラグ・プラン別公式URL

alter table public.service_plans
  add column if not exists is_default_comparison_plan boolean not null default false;

alter table public.service_plans
  add column if not exists is_recommended boolean not null default false;

alter table public.service_plans
  add column if not exists official_url text;

comment on column public.service_plans.is_default_comparison_plan is
  '比較表の初期表示プラン。サービス内で1件のみ推奨。';

comment on column public.service_plans.is_recommended is
  '推奨プラン。代表未指定時のフォールバック候補。';

comment on column public.service_plans.official_url is
  'プラン別の公式ページURL（任意）。未設定時はサービス公式URLを使用。';

-- サービスあたり代表プランは最大1件
create unique index if not exists service_plans_one_default_per_service_idx
  on public.service_plans (service_id)
  where is_default_comparison_plan = true;

create index if not exists service_plans_default_comparison_idx
  on public.service_plans (service_id, is_default_comparison_plan)
  where is_published = true;

-- 既存の先頭プランを代表に設定（まだ未設定のサービスのみ）
update public.service_plans p
set is_default_comparison_plan = true
where p.id in (
  select distinct on (sp.service_id) sp.id
  from public.service_plans sp
  where sp.is_published = true
  order by sp.service_id, sp.display_order asc, sp.name asc
)
and not exists (
  select 1
  from public.service_plans other
  where other.service_id = p.service_id
    and other.is_default_comparison_plan = true
);

-- デモ用: 主要サービスの複数プラン（未登録時のみ追加）
insert into public.service_plans (
  service_id, name, slug,
  regular_monthly_price, campaign_monthly_price, effective_monthly_price,
  initial_fee, billing_period, storage_value, storage_unit,
  display_order, is_published, is_default_comparison_plan, is_recommended
)
select s.id, v.name, v.slug,
  v.regular_monthly_price, v.campaign_monthly_price, v.effective_monthly_price,
  v.initial_fee, v.billing_period, v.storage_value, v.storage_unit,
  v.display_order, true, false, v.is_recommended
from public.services s
join (
  values
    ('xserver', 'プレミアム', 'premium', 1980::numeric, 1320::numeric, 1320::numeric, 0::numeric, '12ヶ月〜', 700::numeric, 'GB', 10, false),
    ('xserver', 'ビジネス', 'business', 3960::numeric, 2640::numeric, 2640::numeric, 0::numeric, '12ヶ月〜', 1000::numeric, 'GB', 20, false),
    ('conoha-wing', 'スタンダード', 'standard', 1936::numeric, 968::numeric, 968::numeric, 0::numeric, '12ヶ月〜', 300::numeric, 'GB', 10, true),
    ('conoha-wing', 'プレミアム', 'premium', 3872::numeric, 1936::numeric, 1936::numeric, 0::numeric, '12ヶ月〜', 400::numeric, 'GB', 20, false),
    ('lolipop', 'ハイスピード', 'high-speed', 1400::numeric, 550::numeric, 550::numeric, 0::numeric, '12ヶ月〜', 350::numeric, 'GB', 0, true),
    ('lolipop', 'エンタープライズ', 'enterprise', 3000::numeric, 1500::numeric, 1500::numeric, 0::numeric, '12ヶ月〜', 500::numeric, 'GB', 10, false)
) as v(service_slug, name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, billing_period, storage_value, storage_unit, display_order, is_recommended)
  on s.slug = v.service_slug
where not exists (
  select 1
  from public.service_plans p
  where p.service_id = s.id and p.slug = v.slug
);

-- 既存のスタンダード等を代表に（上記で代表が無い場合）
update public.service_plans p
set is_default_comparison_plan = true
from public.services s
where p.service_id = s.id
  and (
    (s.slug = 'xserver' and p.slug = 'standard')
    or (s.slug = 'conoha-wing' and p.slug = 'basic')
    or (s.slug = 'lolipop' and p.slug = 'high-speed')
  )
  and not exists (
    select 1 from public.service_plans o
    where o.service_id = p.service_id and o.is_default_comparison_plan = true
  );
