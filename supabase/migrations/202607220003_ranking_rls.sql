-- ランキング系テーブルの RLS（適用済みでも再実行可）
-- Supabase で RLS が ON のとき、ポリシー無しだと管理者でも INSERT できない

alter table public.ranking_entries enable row level security;
alter table public.cms_ranking_drafts enable row level security;
alter table public.ranking_publish_history enable row level security;

-- 公開サイト: 公開ランキングの読み取り
drop policy if exists ranking_entries_public_read on public.ranking_entries;
create policy ranking_entries_public_read
  on public.ranking_entries for select
  using (true);

drop policy if exists ranking_entries_admin_all on public.ranking_entries;
create policy ranking_entries_admin_all
  on public.ranking_entries for all
  using (public.is_admin())
  with check (public.is_admin());

-- 下書き: 管理者のみ
drop policy if exists cms_ranking_drafts_admin_all on public.cms_ranking_drafts;
create policy cms_ranking_drafts_admin_all
  on public.cms_ranking_drafts for all
  using (public.is_admin())
  with check (public.is_admin());

-- 公開履歴: 管理者のみ
drop policy if exists ranking_publish_history_admin_all on public.ranking_publish_history;
create policy ranking_publish_history_admin_all
  on public.ranking_publish_history for all
  using (public.is_admin())
  with check (public.is_admin());
