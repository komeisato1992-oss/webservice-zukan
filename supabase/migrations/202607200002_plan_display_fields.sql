-- Optional display override and storage type on service_plans
alter table public.service_plans
  add column if not exists display_name text,
  add column if not exists storage_type text;

comment on column public.service_plans.display_name is
  'サイト表示用プラン名。空の場合は name に「プラン」を付与して表示する';

comment on column public.service_plans.storage_type is
  'プラン別ストレージ種類（SSD / NVMe 等）。サービス共通値と異なる場合のみ設定';
