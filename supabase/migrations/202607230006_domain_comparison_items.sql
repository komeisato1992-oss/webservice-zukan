-- Domain dictionary: comparison item visibility / order / display settings
-- Isolated from server comparison_fields via dictionary_id

create table if not exists public.domain_comparison_items (
  id uuid primary key default gen_random_uuid(),
  dictionary_id uuid not null references public.dictionaries (id) on delete cascade,
  group_key text not null
    check (group_key in ('price', 'feature', 'support')),
  item_key text not null
    check (item_key ~ '^[a-z0-9_]+$'),
  display_name text not null,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  highlight_best boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_comparison_items_dictionary_item_unique
    unique (dictionary_id, item_key)
);

create index if not exists domain_comparison_items_dict_group_order_idx
  on public.domain_comparison_items (dictionary_id, group_key, sort_order);

create trigger domain_comparison_items_set_updated_at
before update on public.domain_comparison_items
for each row execute function public.set_updated_at();

alter table public.domain_comparison_items enable row level security;

drop policy if exists domain_comparison_items_admin_select on public.domain_comparison_items;
create policy domain_comparison_items_admin_select
  on public.domain_comparison_items for select
  using (public.is_admin());

drop policy if exists domain_comparison_items_admin_insert on public.domain_comparison_items;
create policy domain_comparison_items_admin_insert
  on public.domain_comparison_items for insert
  with check (public.is_admin());

drop policy if exists domain_comparison_items_admin_update on public.domain_comparison_items;
create policy domain_comparison_items_admin_update
  on public.domain_comparison_items for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists domain_comparison_items_admin_delete on public.domain_comparison_items;
create policy domain_comparison_items_admin_delete
  on public.domain_comparison_items for delete
  using (public.is_admin());

-- Idempotent seed for dictionary slug = domain
do $$
declare
  v_dictionary_id uuid;
begin
  select id into v_dictionary_id
  from public.dictionaries
  where slug = 'domain';

  if v_dictionary_id is null then
    raise notice 'dictionary slug=domain が見つからないため seed をスキップ';
    return;
  end if;

  insert into public.domain_comparison_items (
    dictionary_id,
    group_key,
    item_key,
    display_name,
    is_visible,
    sort_order,
    highlight_best
  )
  values
    -- price
    (v_dictionary_id, 'price', 'com_registration', '取得料金', true, 1, false),
    (v_dictionary_id, 'price', 'com_renewal', '更新料金', true, 2, false),
    (v_dictionary_id, 'price', 'com_transfer', '移管料金', false, 3, false),
    (v_dictionary_id, 'price', 'jp_registration', '取得料金', true, 4, false),
    (v_dictionary_id, 'price', 'jp_renewal', '更新料金', true, 5, false),
    (v_dictionary_id, 'price', 'jp_transfer', '移管料金', false, 6, false),
    (v_dictionary_id, 'price', 'co_jp_registration', '取得料金', true, 7, false),
    (v_dictionary_id, 'price', 'co_jp_renewal', '更新料金', true, 8, false),
    (v_dictionary_id, 'price', 'co_jp_transfer', '移管料金', false, 9, false),
    (v_dictionary_id, 'price', 'net_registration', '取得料金', true, 10, false),
    (v_dictionary_id, 'price', 'net_renewal', '更新料金', true, 11, false),
    (v_dictionary_id, 'price', 'net_transfer', '移管料金', false, 12, false),
    -- feature
    (v_dictionary_id, 'feature', 'whois_privacy', 'Whois代理公開', true, 1, false),
    (v_dictionary_id, 'feature', 'dns', 'DNS設定', true, 2, false),
    (v_dictionary_id, 'feature', 'dnssec', 'DNSSEC', true, 3, false),
    (v_dictionary_id, 'feature', 'auto_renewal', '自動更新', true, 4, false),
    (v_dictionary_id, 'feature', 'domain_transfer', 'ドメイン移管', true, 5, false),
    (v_dictionary_id, 'feature', 'japanese_domain', '日本語ドメイン', false, 6, false),
    -- support
    (v_dictionary_id, 'support', 'phone_support', '電話サポート', true, 1, false),
    (v_dictionary_id, 'support', 'email_support', 'メールサポート', true, 2, false),
    (v_dictionary_id, 'support', 'chat_support', 'チャットサポート', true, 3, false),
    (v_dictionary_id, 'support', 'free_domain_benefit', '無料ドメイン特典', true, 4, false),
    (v_dictionary_id, 'support', 'server_bundle_benefit', 'サーバー同時契約特典', true, 5, false)
  on conflict (dictionary_id, item_key) do nothing;
end $$;
