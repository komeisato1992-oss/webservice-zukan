-- Phase 3: 全サービス更新ジョブ履歴
-- 公開テーブル（services / plans / comparison_*）へは書き込まない
-- 取得候補は従来どおり scraping_runs に保存する

create table if not exists public.bulk_scraping_jobs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  unsupported_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bulk_scraping_jobs_created_at_idx
  on public.bulk_scraping_jobs (created_at desc);

create trigger bulk_scraping_jobs_set_updated_at
before update on public.bulk_scraping_jobs
for each row execute function public.set_updated_at();

alter table public.bulk_scraping_jobs enable row level security;

drop policy if exists bulk_scraping_jobs_admin_select on public.bulk_scraping_jobs;
create policy bulk_scraping_jobs_admin_select
  on public.bulk_scraping_jobs for select
  using (public.is_admin());

drop policy if exists bulk_scraping_jobs_admin_insert on public.bulk_scraping_jobs;
create policy bulk_scraping_jobs_admin_insert
  on public.bulk_scraping_jobs for insert
  with check (public.is_admin());

drop policy if exists bulk_scraping_jobs_admin_update on public.bulk_scraping_jobs;
create policy bulk_scraping_jobs_admin_update
  on public.bulk_scraping_jobs for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists bulk_scraping_jobs_admin_delete on public.bulk_scraping_jobs;
create policy bulk_scraping_jobs_admin_delete
  on public.bulk_scraping_jobs for delete
  using (public.is_admin());
