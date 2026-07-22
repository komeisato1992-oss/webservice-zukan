-- Fix: publish failed because these columns were missing on some DBs
-- (migration 202607190001 may not have been applied).
-- Safe to re-run (IF NOT EXISTS).

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

create unique index if not exists service_plans_one_default_per_service_idx
  on public.service_plans (service_id)
  where is_default_comparison_plan = true;

create index if not exists service_plans_default_comparison_idx
  on public.service_plans (service_id, is_default_comparison_plan)
  where is_published = true;
