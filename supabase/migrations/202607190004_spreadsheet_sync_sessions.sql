-- Enhance spreadsheet sync for multi-sheet session workflow
-- Reuses spreadsheet_sync_runs / spreadsheet_sync_changes; adds errors table

-- ---------------------------------------------------------------------------
-- spreadsheet_sync_runs: session fields + expanded statuses
-- ---------------------------------------------------------------------------
alter table public.spreadsheet_sync_runs
  add column if not exists spreadsheet_id text;

alter table public.spreadsheet_sync_runs
  add column if not exists started_at timestamptz;

alter table public.spreadsheet_sync_runs
  add column if not exists total_rows integer not null default 0;

alter table public.spreadsheet_sync_runs
  add column if not exists added_count integer not null default 0;

alter table public.spreadsheet_sync_runs
  add column if not exists changed_count integer not null default 0;

alter table public.spreadsheet_sync_runs
  add column if not exists unchanged_count integer not null default 0;

alter table public.spreadsheet_sync_runs
  add column if not exists warning_count integer not null default 0;

alter table public.spreadsheet_sync_runs
  add column if not exists applied_at timestamptz;

-- Expand sync_type
alter table public.spreadsheet_sync_runs drop constraint if exists spreadsheet_sync_runs_sync_type_check;
alter table public.spreadsheet_sync_runs
  add constraint spreadsheet_sync_runs_sync_type_check
  check (sync_type in (
    'export_csv',
    'export_xlsx',
    'export_sheets',
    'preview_csv',
    'preview_xlsx',
    'preview_sheets',
    'spreadsheet_export',
    'spreadsheet_import',
    'apply',
    'rollback',
    'connection_test',
    'scraping'
  ));

-- Expand source
alter table public.spreadsheet_sync_runs drop constraint if exists spreadsheet_sync_runs_source_check;
alter table public.spreadsheet_sync_runs
  add constraint spreadsheet_sync_runs_source_check
  check (source in (
    'google_sheets',
    'csv',
    'xlsx',
    'manual_admin',
    'scraping',
    'system'
  ));

-- Expand status for review/apply lifecycle
alter table public.spreadsheet_sync_runs drop constraint if exists spreadsheet_sync_runs_status_check;
alter table public.spreadsheet_sync_runs
  add constraint spreadsheet_sync_runs_status_check
  check (status in (
    'pending',
    'running',
    'success',
    'partial',
    'failed',
    'rolled_back',
    'fetched',
    'awaiting_review',
    'applying',
    'applied',
    'cancelled'
  ));

comment on table public.spreadsheet_sync_runs is
  'Spreadsheet/scraping sync sessions (export → import → review → apply)';

-- ---------------------------------------------------------------------------
-- spreadsheet_sync_changes: sheet/table/selection metadata
-- ---------------------------------------------------------------------------
alter table public.spreadsheet_sync_changes
  add column if not exists sheet_name text;

alter table public.spreadsheet_sync_changes
  add column if not exists table_name text;

alter table public.spreadsheet_sync_changes
  add column if not exists record_id text;

alter table public.spreadsheet_sync_changes
  add column if not exists record_slug text;

alter table public.spreadsheet_sync_changes
  add column if not exists plan_name text;

alter table public.spreadsheet_sync_changes
  add column if not exists selected boolean not null default false;

alter table public.spreadsheet_sync_changes
  add column if not exists row_number integer;

alter table public.spreadsheet_sync_changes
  add column if not exists warning text;

alter table public.spreadsheet_sync_changes drop constraint if exists spreadsheet_sync_changes_change_type_check;
alter table public.spreadsheet_sync_changes
  add constraint spreadsheet_sync_changes_change_type_check
  check (change_type in (
    'changed',
    'added',
    'cleared',
    'error',
    'conflict',
    'unchanged'
  ));

-- ---------------------------------------------------------------------------
-- spreadsheet_sync_errors
-- ---------------------------------------------------------------------------
create table if not exists public.spreadsheet_sync_errors (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.spreadsheet_sync_runs (id) on delete cascade,
  sheet_name text,
  row_number integer,
  record_id text,
  error_code text,
  message text not null,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists spreadsheet_sync_errors_session_idx
  on public.spreadsheet_sync_errors (session_id);

alter table public.spreadsheet_sync_errors enable row level security;

drop policy if exists spreadsheet_sync_errors_admin_all on public.spreadsheet_sync_errors;
create policy spreadsheet_sync_errors_admin_all
  on public.spreadsheet_sync_errors
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Prevent concurrent apply: at most one applying session
create unique index if not exists spreadsheet_sync_runs_one_applying_idx
  on public.spreadsheet_sync_runs ((status))
  where status = 'applying';
