-- Phase 2c: scraping_runs（公式情報取得の候補結果を公開データと分離して保存）
-- Auth: anon key + RLS + Supabase Auth（service_role 不使用）
-- 公開テーブル（services / service_plans / comparison_*）へは書き込まない

create table if not exists public.scraping_runs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  provider text not null,
  status text not null
    check (status in ('pending', 'running', 'success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  source_urls jsonb not null default '[]'::jsonb,
  result_json jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  found_count integer,
  missing_count integer,
  duration_ms integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scraping_runs_service_created_idx
  on public.scraping_runs (service_id, created_at desc);

create index if not exists scraping_runs_status_idx
  on public.scraping_runs (status);

create trigger scraping_runs_set_updated_at
before update on public.scraping_runs
for each row execute function public.set_updated_at();

alter table public.scraping_runs enable row level security;

drop policy if exists scraping_runs_admin_select on public.scraping_runs;
create policy scraping_runs_admin_select
  on public.scraping_runs for select
  using (public.is_admin());

drop policy if exists scraping_runs_admin_insert on public.scraping_runs;
create policy scraping_runs_admin_insert
  on public.scraping_runs for insert
  with check (public.is_admin());

drop policy if exists scraping_runs_admin_update on public.scraping_runs;
create policy scraping_runs_admin_update
  on public.scraping_runs for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists scraping_runs_admin_delete on public.scraping_runs;
create policy scraping_runs_admin_delete
  on public.scraping_runs for delete
  using (public.is_admin());
