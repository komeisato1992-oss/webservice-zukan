-- Spreadsheet sync: data_version, sync history, field overrides (manual lock)
-- Does not alter public scrape → approve flow; overrides only gate auto-apply
-- Idempotent: safe to re-run in Supabase SQL Editor

-- ---------------------------------------------------------------------------
-- services.data_version（楽観ロック用）
-- ---------------------------------------------------------------------------
alter table public.services
  add column if not exists data_version integer not null default 1;

comment on column public.services.data_version is
  'Incremented on each service update; used for spreadsheet import conflict detection';

create or replace function public.bump_service_data_version()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.data_version := coalesce(old.data_version, 1) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists services_bump_data_version on public.services;
create trigger services_bump_data_version
before update on public.services
for each row execute function public.bump_service_data_version();

-- ---------------------------------------------------------------------------
-- spreadsheet_sync_runs
-- ---------------------------------------------------------------------------
create table if not exists public.spreadsheet_sync_runs (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null
    check (sync_type in (
      'export_csv',
      'export_xlsx',
      'export_sheets',
      'preview_csv',
      'preview_xlsx',
      'preview_sheets',
      'apply',
      'rollback',
      'connection_test'
    )),
  source text not null
    check (source in (
      'google_sheets',
      'csv',
      'xlsx',
      'manual_admin',
      'scraping',
      'system'
    )),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'success', 'partial', 'failed', 'rolled_back')),
  exported_count integer not null default 0,
  difference_count integer not null default 0,
  applied_count integer not null default 0,
  error_count integer not null default 0,
  target_service_ids uuid[] not null default '{}',
  message text,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists spreadsheet_sync_runs_created_at_idx
  on public.spreadsheet_sync_runs (created_at desc);

drop trigger if exists spreadsheet_sync_runs_set_updated_at on public.spreadsheet_sync_runs;
create trigger spreadsheet_sync_runs_set_updated_at
before update on public.spreadsheet_sync_runs
for each row execute function public.set_updated_at();

alter table public.spreadsheet_sync_runs enable row level security;

drop policy if exists spreadsheet_sync_runs_admin_all on public.spreadsheet_sync_runs;
create policy spreadsheet_sync_runs_admin_all
  on public.spreadsheet_sync_runs
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- spreadsheet_sync_changes
-- ---------------------------------------------------------------------------
create table if not exists public.spreadsheet_sync_changes (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.spreadsheet_sync_runs (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  service_slug text,
  service_name text,
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  change_type text not null
    check (change_type in ('changed', 'added', 'cleared', 'error', 'conflict', 'unchanged')),
  status text not null default 'pending'
    check (status in ('pending', 'selected', 'applied', 'skipped', 'error', 'rolled_back')),
  error_message text,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists spreadsheet_sync_changes_run_idx
  on public.spreadsheet_sync_changes (sync_run_id);

create index if not exists spreadsheet_sync_changes_service_idx
  on public.spreadsheet_sync_changes (service_id);

alter table public.spreadsheet_sync_changes enable row level security;

drop policy if exists spreadsheet_sync_changes_admin_all on public.spreadsheet_sync_changes;
create policy spreadsheet_sync_changes_admin_all
  on public.spreadsheet_sync_changes
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- service_field_overrides（手動ロック / 手動値）
-- ---------------------------------------------------------------------------
create table if not exists public.service_field_overrides (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  field_name text not null,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'scraped', 'imported', 'system')),
  manual_override boolean not null default false,
  manual_value jsonb,
  scraped_value jsonb,
  last_verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_field_overrides_unique unique (service_id, field_name)
);

create index if not exists service_field_overrides_service_idx
  on public.service_field_overrides (service_id);

drop trigger if exists service_field_overrides_set_updated_at on public.service_field_overrides;
create trigger service_field_overrides_set_updated_at
before update on public.service_field_overrides
for each row execute function public.set_updated_at();

alter table public.service_field_overrides enable row level security;

drop policy if exists service_field_overrides_admin_all on public.service_field_overrides;
create policy service_field_overrides_admin_all
  on public.service_field_overrides
  for all
  using (public.is_admin())
  with check (public.is_admin());
