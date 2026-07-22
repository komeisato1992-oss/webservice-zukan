-- TOP page placement flags (admin-managed initial display only)
-- Does not affect compare-page user selection

alter table public.services
  add column if not exists show_in_top_featured_comparison boolean not null default false;

alter table public.services
  add column if not exists show_in_top_comparison boolean not null default false;

alter table public.services
  add column if not exists top_featured_display_order integer;

alter table public.services
  add column if not exists top_comparison_display_order integer;

comment on column public.services.show_in_top_featured_comparison is
  'TOP hero「人気3社の比較」初期表示対象（最大3件・公開中のみ）';

comment on column public.services.show_in_top_comparison is
  'TOP本文「レンタルサーバーを比較」初期表示対象（最大10件・公開中のみ）';

comment on column public.services.top_featured_display_order is
  '人気3社比較の表示順（小さいほど先）';

comment on column public.services.top_comparison_display_order is
  'TOP比較表の表示順（小さいほど先）';

create index if not exists services_top_featured_idx
  on public.services (show_in_top_featured_comparison, top_featured_display_order)
  where show_in_top_featured_comparison = true;

create index if not exists services_top_comparison_idx
  on public.services (show_in_top_comparison, top_comparison_display_order)
  where show_in_top_comparison = true;
