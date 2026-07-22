-- Phase 2b: comparison_fields に display_group / select_options を追加
-- options(text) → select_options(jsonb) へ移行
-- comparison_values の公開読取を「公開サービス × 公開比較項目」に限定

-- ---------------------------------------------------------------------------
-- comparison_fields: display_group
-- ---------------------------------------------------------------------------
alter table public.comparison_fields
  add column if not exists display_group text;

-- ---------------------------------------------------------------------------
-- comparison_fields: select_options (jsonb 配列)
-- ---------------------------------------------------------------------------
alter table public.comparison_fields
  add column if not exists select_options jsonb not null default '[]'::jsonb;

-- 旧 options(text, カンマ区切り) があれば移行して削除
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'comparison_fields'
      and column_name = 'options'
  ) then
    update public.comparison_fields
    set select_options = coalesce(
      (
        select jsonb_agg(to_jsonb(trim(both from part)))
        from unnest(string_to_array(options, ',')) as part
        where trim(both from part) <> ''
      ),
      '[]'::jsonb
    )
    where options is not null
      and btrim(options) <> ''
      and (
        select_options is null
        or select_options = '[]'::jsonb
      );

    alter table public.comparison_fields drop column options;
  end if;
end $$;

create index if not exists comparison_fields_display_group_idx
  on public.comparison_fields (category_id, display_group);

-- ---------------------------------------------------------------------------
-- RLS: comparison_values 公開読取を厳格化
-- ---------------------------------------------------------------------------
drop policy if exists comparison_values_public_read on public.comparison_values;

create policy comparison_values_public_read
  on public.comparison_values for select
  using (
    public.is_admin()
    or (
      exists (
        select 1
        from public.services s
        where s.id = comparison_values.service_id
          and s.is_published = true
      )
      and exists (
        select 1
        from public.comparison_fields cf
        where cf.id = comparison_values.comparison_field_id
          and cf.is_published = true
      )
    )
  );
